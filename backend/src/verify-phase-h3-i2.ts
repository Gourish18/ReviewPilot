import { app } from './app.js';
import http from 'http';
import crypto from 'crypto';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { Review } from './models/Review.js';
import { compiledReviewWorkflow } from './services/review/nodes/workflow.js';
import { env } from './config/env.js';

async function runVerification() {
  console.log('--- Phase H.3 / I.2 Full Webhook Integration Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  await Review.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test records...');
  await User.deleteMany({ githubId: { $in: [444444, 444445] } });
  await Repository.deleteMany({ githubRepoId: { $in: [55001, 55002] } });
  await Review.deleteMany({ prNumber: { $in: [6001, 6002, 6003] } });

  // Create a mock User for successful runs
  console.log('Creating test users...');
  const testUser = await User.create({
    githubId: 444444,
    username: 'test-success-pilot',
    email: 'success@reviewpilot.com',
    accessToken: 'mock_access_token_123',
  });

  // Create a mock User for comment publishing failure run
  const failUser = await User.create({
    githubId: 444445,
    username: 'test-commentfail-pilot',
    email: 'commentfail@reviewpilot.com',
    accessToken: 'mock_comment_fail_token',
  });

  // Seed repositories
  console.log('Seeding repositories...');
  const repoConnected = await Repository.create({
    userId: testUser._id,
    githubRepoId: 55001,
    owner: 'test-success-pilot',
    name: 'repo-e2e-connected',
    fullName: 'test-success-pilot/repo-e2e-connected',
    private: false,
    isConnected: true,
  });

  const repoFailConnected = await Repository.create({
    userId: failUser._id,
    githubRepoId: 55002,
    owner: 'test-commentfail-pilot',
    name: 'repo-e2e-fail',
    fullName: 'test-commentfail-pilot/repo-e2e-fail',
    private: false,
    isConnected: true,
  });

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  const generateSignature = (payload: string, secret: string): string => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return 'sha256=' + hmac.digest('hex');
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Full E2E Success Path (Pending -> Completed -> Comment Published)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing E2E Success Path (Pending -> Completed -> Comment Published)...');
    const payload1 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 55001,
        name: 'repo-e2e-connected',
        full_name: 'test-success-pilot/repo-e2e-connected',
        owner: {
          login: 'test-success-pilot'
        }
      },
      pull_request: {
        number: 6001,
        title: 'feat: add full system integration',
        body: 'Implement comment publishing integration on webhooks.',
      }
    });
    const sig1 = generateSignature(payload1, env.githubWebhookSecret);

    const res1 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig1,
      },
      body: payload1,
    });

    console.log('Response Status (Expected 200):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body:', JSON.stringify(body1));

    // Verify Review Record exists in database as completed
    const reviewRecord1 = await Review.findOne({
      repositoryId: repoConnected._id,
      prNumber: 6001
    });

    if (!reviewRecord1) {
      throw new Error('FAIL: Review record was not created in the database.');
    }

    console.log('Database Review Record Found:', reviewRecord1.toJSON());

    if (
      reviewRecord1.status === 'completed' &&
      reviewRecord1.triageCategory === 'backend' &&
      reviewRecord1.securityFindings.length === 2 &&
      reviewRecord1.logicFindings.length === 2 &&
      reviewRecord1.markdownReport.includes('🛡️ Security Vulnerabilities')
    ) {
      console.log('SUCCESS: Full E2E review creation, AI analysis, persistence, and mock comment publishing succeeded.');
    } else {
      throw new Error(`FAIL: Review Record state or findings mismatched. Status: ${reviewRecord1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: AI Analysis Node Failure Path (Pending -> Failed)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing LangGraph Workflow Failure Path (Pending -> Failed)...');
    
    // Temporarily mock compiledReviewWorkflow.invoke to throw an error
    const originalInvoke = compiledReviewWorkflow.invoke;
    compiledReviewWorkflow.invoke = async () => {
      throw new Error('Simulated LangGraph workflow execution exception');
    };

    const payload2 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 55001,
        name: 'repo-e2e-connected',
        full_name: 'test-success-pilot/repo-e2e-connected',
        owner: {
          login: 'test-success-pilot'
        }
      },
      pull_request: {
        number: 6002,
        title: 'feat: trigger simulated AI failure',
        body: 'Simulate workflow crash.',
      }
    });
    const sig2 = generateSignature(payload2, env.githubWebhookSecret);

    const res2 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig2,
      },
      body: payload2,
    });

    // Restore original invoke method
    compiledReviewWorkflow.invoke = originalInvoke;

    console.log('Response Status (Expected 500):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));

    // Verify Review Record exists in database as failed
    const reviewRecord2 = await Review.findOne({
      repositoryId: repoConnected._id,
      prNumber: 6002
    });

    if (!reviewRecord2) {
      throw new Error('FAIL: Review record for failed run was not created.');
    }

    console.log('Database Review Record Found for Failed Run:', reviewRecord2.toJSON());

    if (reviewRecord2.status === 'failed') {
      console.log('SUCCESS: Review Record correctly marked "failed" upon workflow exception.');
    } else {
      throw new Error(`FAIL: Review Record state mismatched. Expected "failed", got: ${reviewRecord2.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Comment Publishing Failure Path (Pending -> Failed)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing Comment Publishing Failure Path (Pending -> Failed)...');
    
    const payload3 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 55002,
        name: 'repo-e2e-fail',
        full_name: 'test-commentfail-pilot/repo-e2e-fail',
        owner: {
          login: 'test-commentfail-pilot'
        }
      },
      pull_request: {
        number: 6003,
        title: 'feat: trigger simulated comment publishing failure',
        body: 'Simulate comment publishing crash.',
      }
    });
    const sig3 = generateSignature(payload3, env.githubWebhookSecret);

    const res3 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig3,
      },
      body: payload3,
    });

    console.log('Response Status (Expected 500):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));

    // Verify Review Record exists in database as failed
    const reviewRecord3 = await Review.findOne({
      repositoryId: repoFailConnected._id,
      prNumber: 6003
    });

    if (!reviewRecord3) {
      throw new Error('FAIL: Review record for failed comment publishing was not created.');
    }

    console.log('Database Review Record Found for Comment Publishing Failure:', reviewRecord3.toJSON());

    if (reviewRecord3.status === 'failed') {
      console.log('SUCCESS: Review Record correctly transitioned to "failed" when comment publishing threw an exception.');
    } else {
      throw new Error(`FAIL: Review Record state mismatched. Expected "failed", got: ${reviewRecord3.status}`);
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Review.deleteMany({ prNumber: { $in: [6001, 6002, 6003] } });
    await Repository.deleteMany({ githubRepoId: { $in: [55001, 55002] } });
    await User.deleteMany({ githubId: { $in: [444444, 444445] } });
    console.log('Cleanup finished.');

    console.log('Disconnecting from database...');
    await disconnectDatabase();

    console.log('Shutting down test server...');
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Test server closed.');
        resolve();
      });
    });
  }
}

void runVerification();
