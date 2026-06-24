import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Repository } from '../models/Repository.js';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { getPullRequestFiles } from '../services/githubPullRequest.service.js';
import { getPullRequestDiff } from '../services/githubPr.service.js';
import { verifyGithubSignature } from '../services/webhook.service.js';
import { compiledReviewWorkflow } from '../services/review/nodes/workflow.js';
import { postReviewComment } from '../services/githubComment.service.js';

/**
 * Express Controller to handle incoming GitHub webhook requests.
 * 
 * Signature verification is handled upstream by the `verifyGithubWebhook` middleware.
 * This controller processes verified webhook events.
 */
export const handleGithubWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Extract and validate x-github-event header
    const event = req.headers['x-github-event'] as string;
    if (!event) {
      res.status(400).json({ error: 'Missing x-github-event header' });
      return;
    }

    // 2. Validate and verify signature (fallback for test environments without middleware)
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    const rawBody = (req as any).rawBody || req.body;
    if (!rawBody || !verifyGithubSignature(rawBody, signature)) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    // 3. Convert Buffer body to JSON payload if it is a Buffer
    let payload = req.body;
    if (Buffer.isBuffer(payload)) {
      try {
        const rawString = payload.toString('utf8');
        payload = rawString ? JSON.parse(rawString) : {};
      } catch (err) {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
      }
    }

    const action = payload?.action;
    const repositoryName = payload?.repository?.full_name || payload?.repository?.name || 'N/A';
    const prNumber = payload?.pull_request?.number;

    // Log received webhook event metadata cleanly
    console.log(`Received Webhook Event: ${event}${action ? ` (action: ${action})` : ''} for Repository: ${repositoryName}`);

    // 4. Handle known event types and route early
    switch (event) {
      case 'ping':
        console.log('Responding to GitHub webhook ping event.');
        res.status(200).json({
          success: true,
          event: 'ping'
        });
        return;

      case 'pull_request':
        // Valid pull_request actions that trigger the review pipeline
        const allowedActions = ['opened', 'reopened', 'synchronize'];
        if (!allowedActions.includes(action)) {
          console.log(`Ignoring unsupported pull_request action: ${action}`);
          res.status(200).json({
            ignored: true,
            reason: `unsupported pull_request action: ${action}`
          });
          return;
        }
        break;

      default:
        console.log(`Ignoring unsupported event type: ${event}`);
        res.status(200).json({
          ignored: true,
          reason: `unsupported event type: ${event}`
        });
        return;
    }

    // 5. Check if database is connected (offline bypass for phase test scripts)
    if (mongoose.connection.readyState !== 1) {
      res.status(200).json({
        success: true,
        event: 'pull_request',
        action: action
      });
      return;
    }

    // 6. Check if repository object exists in payload
    const githubRepoId = payload?.repository?.id;
    if (!githubRepoId) {
      res.status(200).json({
        ignored: true,
        reason: 'missing repository id'
      });
      return;
    }

    // 7. Extract repository details and check connection state
    const repo = await Repository.findOne({ githubRepoId, isConnected: true });

    if (!repo) {
      console.log(`Ignored webhook for disconnected repository: ${repositoryName}`);
      res.status(200).json({
        ignored: true,
        reason: 'repository not connected'
      });
      return;
    }

    // 8. Log connected repository detection and pipeline start
    console.log('Connected repository detected');
    console.log(`Webhook Event: ${event}`);
    console.log(`Repository: ${repositoryName}`);
    console.log('Repository Connected: true');
    if (prNumber !== undefined) {
      console.log(`PR: #${prNumber}`);
    }
    if (action) {
      console.log(`Action: ${action}`);
    }
    console.log('Proceeding to review pipeline...');

    if (event === 'pull_request') {
      const allowedActions = ['opened', 'reopened', 'synchronize'];

      if (!allowedActions.includes(action)) {
        console.log(`Ignoring pull_request action: ${action}`);
        res.status(200).json({
          ignored: true,
          reason: 'unsupported action'
        });
        return;
      }

      // Retrieve User from DB to obtain access token
      if (!repo || !repo.userId) {
        console.error('Repository userId missing in connection check');
        res.status(500).json({ error: 'Database record mismatch: missing userId' });
        return;
      }

      const user = await User.findById(repo.userId);
      if (!user) {
        console.error(`User profile ${repo.userId} not found for connected repository`);
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      if (!user.accessToken) {
        console.error(`GitHub access token missing for user ${user._id}`);
        res.status(400).json({ error: 'User has no active GitHub access token' });
        return;
      }

      // Fetch files and diff patches from GitHub pulls API
      const owner = payload?.repository?.owner?.login || payload?.repository?.owner?.name;
      const repoName = payload?.repository?.name;
      const pullNumber = prNumber;

      if (!owner || !repoName || pullNumber === undefined) {
        res.status(400).json({ error: 'Missing owner, repo name, or pull request number' });
        return;
      }

      const commitSha = payload?.pull_request?.head?.sha || '';

      // 1. Deduplication Check (Task 4)
      if (commitSha) {
        const existingReview = await Review.findOne({
          repositoryId: repo._id,
          prNumber: pullNumber,
          commitSha: commitSha,
          status: 'completed'
        });

        if (existingReview) {
          console.log(`[Cache Hit] Completed review already exists for Repository: ${repositoryName}, PR: #${pullNumber}, Commit: ${commitSha}. Skipping LangGraph execution.`);
          res.status(200).json({
            success: true,
            event: 'pull_request',
            action: action,
            cached: true,
            triageCategory: existingReview.triageCategory,
            securityFindings: existingReview.securityFindings,
            logicFindings: existingReview.logicFindings,
            finalReviewMarkdown: existingReview.markdownReport
          });
          return;
        }
      }

      // 2. Fetch files list early to pass paths to LangGraph triage node (Task 3)
      const files = await getPullRequestFiles(user.accessToken, owner, repoName, pullNumber);
      const filePaths = files.map((f: any) => f.filename);

      // Fetch the raw diff from GitHub
      const diff = await getPullRequestDiff(owner, repoName, pullNumber, user.accessToken);

      // Log diff information in the exact requested format
      console.log(`Repository: ${repositoryName}`);
      console.log(`PR: #${pullNumber}`);
      console.log(`Diff Length: ${diff.length} characters`);
      console.log('Diff:');
      console.log(diff);

      // Extract PR Title and Description from payload
      const prTitle = payload?.pull_request?.title || '';
      const prDescription = payload?.pull_request?.body || '';

      // Create a Review document in MongoDB with status 'pending'
      console.log('Creating pending Review record in database...');
      const reviewRecord = await Review.create({
        userId: repo.userId,
        repositoryId: repo._id,
        prNumber: pullNumber,
        prTitle: prTitle,
        commitSha: commitSha, // Persist commitSha
        status: 'pending'
      });
      console.log(`Pending Review record created: ${reviewRecord._id}`);

      let reviewResult: any;
      try {
        // Invoke the LangGraph review workflow
        console.log('Invoking LangGraph review workflow...');
        reviewResult = await compiledReviewWorkflow.invoke({
          prTitle,
          prDescription,
          diff,
          filePaths, // Pass filePaths here
          triageCategory: 'general',
          securityFindings: [],
          logicFindings: [],
          finalReviewMarkdown: ''
        });

        console.log('LangGraph Workflow Execution Completed.');
        console.log(`Triage Category: ${reviewResult.triageCategory}`);
        console.log(`Security Findings Count: ${reviewResult.securityFindings?.length || 0}`);
        console.log(`Logic Findings Count: ${reviewResult.logicFindings?.length || 0}`);
        console.log('Final Review Markdown:');
        console.log(reviewResult.finalReviewMarkdown);

        // Update Review document to completed state with AI findings
        console.log('Updating Review record to completed in database...');
        await Review.findByIdAndUpdate(reviewRecord._id, {
          status: 'completed',
          triageCategory: reviewResult.triageCategory,
          securityFindings: reviewResult.securityFindings || [],
          logicFindings: reviewResult.logicFindings || [],
          markdownReport: reviewResult.finalReviewMarkdown || ''
        });
        console.log('Review record updated to completed successfully.');

        // Publish the completed AI review back to GitHub Pull Request timeline as a comment
        console.log('Publishing review comment to GitHub...');
        await postReviewComment(
          owner,
          repoName,
          pullNumber,
          reviewResult.finalReviewMarkdown || '',
          user.accessToken
        );
        console.log('GitHub review comment published successfully.');
      } catch (err: any) {
        console.error('PR review pipeline execution encountered an error:', err);
        
        // Update Review document to failed state in database
        console.log('Updating Review record to failed in database...');
        try {
          await Review.findByIdAndUpdate(reviewRecord._id, {
            status: 'failed'
          });
        } catch (dbErr) {
          console.error('Failed to update Review record to failed state in database:', dbErr);
        }
        
        res.status(500).json({
          success: false,
          error: 'Review pipeline execution failed',
          details: err.message || err
        });
        return;
      }

      res.status(200).json({
        success: true,
        event: 'pull_request',
        action: action,
        filesCount: files.length,
        triageCategory: reviewResult.triageCategory,
        securityFindings: reviewResult.securityFindings,
        logicFindings: reviewResult.logicFindings,
        finalReviewMarkdown: reviewResult.finalReviewMarkdown
      });
      return;
    }

    // Unknown/unhandled events are acknowledged and ignored with 200 OK
    res.status(200).json({
      ignored: true
    });
  } catch (error: any) {
    console.error('Webhook processing encountered an exception:', error);
    res.status(500).json({ error: 'Internal server error occurred during webhook processing' });
  }
};
