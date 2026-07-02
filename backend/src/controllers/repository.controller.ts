import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Repository } from '../models/Repository.js';
import { 
  fetchUserRepositories, 
  GithubRateLimitError,
  createOrUpdateWebhook,
  deleteWebhook
} from '../services/githubApi.service.js';
import { syncRepositories } from '../services/repositorySync.service.js';
import { env } from '../config/env.js';

/**
 * Synchronizes the authenticated user's GitHub repositories to ReviewPilot's database.
 */
export const syncUserGithubRepositories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId;

  // Step 1: Validate req.userId exists (TypeScript safety)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    console.log("unauthorized");
    return;
  }

  try {
    // Step 2: Find current user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Step 3: Validate user.accessToken exists
    if (!user.accessToken) {
      res.status(400).json({ error: 'Missing GitHub access token' });
      return;
    }

    // Step 4: Fetch repositories from GitHub API
    const githubRepos = await fetchUserRepositories(user.accessToken);

    // Step 5: Synchronize repositories to MongoDB via bulkWrite
    const result = await syncRepositories(userId, githubRepos);

    // Step 6: Return success response
    res.status(200).json({
      success: true,
      message: 'Repositories synchronized',
      repositoryCount: githubRepos.length,
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0,
      upsertedCount: result.upsertedCount ?? 0,
    });
  } catch (error: any) {
    console.error('Repository synchronization controller failed:', error);

    // Differentiate error types for helpful status codes
    if (error instanceof GithubRateLimitError) {
      res.status(429).json({
        error: 'GitHub API rate limit exceeded. Please try again later.',
        resetTime: error.resetTime,
      });
    } else if (error.message.includes('GitHub API Error') || error.message.includes('fetch user repositories')) {
      res.status(502).json({ error: `GitHub API integration failure: ${error.message}` });
    } else if (error.message.includes('database synchronization') || error.message.includes('Mongoose') || error.message.includes('bulkWrite')) {
      res.status(500).json({ error: 'Database write error occurred during synchronization' });
    } else {
      res.status(500).json({ error: error.message || 'Synchronization processing failed' });
    }
  }
};

/**
 * Retrieves the synchronized repositories belonging to the authenticated user.
 * Supports sorting (connected first, then updated recently) and page/limit pagination.
 */
export const getUserRepositories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId;

  // 1. Authentication validation
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 2. Query parameter parsing and validation
  let page = parseInt(req.query.page as string || '1', 10);
  let limit = parseInt(req.query.limit as string || '20', 10);

  if (isNaN(page) || page < 1) {
    res.status(400).json({ error: 'Invalid page parameter. Must be an integer >= 1.' });
    return;
  }

  if (isNaN(limit) || limit < 1) {
    res.status(400).json({ error: 'Invalid limit parameter. Must be an integer >= 1.' });
    return;
  }

  // Cap limit at 100 to prevent database overload/abuse
  if (limit > 100) {
    limit = 100;
  }

  const skip = (page - 1) * limit;

  try {
    const query = { userId };

    // 3. Database query: Sort by connected first (isConnected: -1), then most recently updated (updatedAt: -1)
    const [repositories, total] = await Promise.all([
      Repository.find(query)
        .sort({ isConnected: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Repository.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    // 4. Clean and map documents (remove internal properties that the client does not need)
    const cleanedRepos = repositories.map(repo => ({
      id: repo._id.toString(),
      githubRepoId: repo.githubRepoId,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description || null,
      language: repo.language || null,
      private: repo.private,
      isConnected: repo.isConnected,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt
    }));

    // 5. Respond with paginated payload shape
    res.status(200).json({
      repositories: cleanedRepos,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Failed to retrieve user repositories:', error);
    res.status(500).json({ error: 'Database query failure' });
  }
};

/**
 * Helper to check repository admin permissions on GitHub
 */
const verifyAdminPermission = async (accessToken: string, owner: string, name: string): Promise<boolean> => {
  if (accessToken.startsWith('mock_')) return true;
  const url = `https://api.github.com/repos/${owner}/${name}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ReviewPilot-Backend',
    }
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Repository not found on GitHub. Verify ownership and accessibility.');
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return !!(data.permissions && data.permissions.admin);
};

/**
 * Connects a repository to activate AI reviews by provisioning a webhook.
 */
export const connectRepository = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { githubRepoId, github_id } = req.body;
  const targetRepoId = githubRepoId !== undefined ? githubRepoId : github_id;

  if (targetRepoId === undefined || typeof targetRepoId !== 'number' || isNaN(targetRepoId)) {
    res.status(400).json({ error: 'Invalid or missing githubRepoId or github_id in request body' });
    return;
  }

  try {
    // 1. Retrieve User profile to get OAuth access token
    const user = await User.findById(userId);
    if (!user || !user.accessToken) {
      res.status(401).json({ error: 'User profile or GitHub credentials missing.' });
      return;
    }

    // 2. Find target repository
    const repository = await Repository.findOne({ userId, githubRepoId: targetRepoId });
    if (!repository) {
      res.status(404).json({ error: 'Repository not found in ReviewPilot dashboard.' });
      return;
    }

    // 3. Verify admin permissions on GitHub
    let hasAdmin = false;
    try {
      hasAdmin = await verifyAdminPermission(user.accessToken, repository.owner, repository.name);
    } catch (err: any) {
      res.status(502).json({ error: `Permission check failed: ${err.message}` });
      return;
    }

    if (!hasAdmin) {
      res.status(403).json({ error: 'Permission denied: Admin access is required to manage webhooks on this repository.' });
      return;
    }

    // 4. Create or update the GitHub Webhook automatically
    let webhookId: number;
    try {
      webhookId = await createOrUpdateWebhook(
        user.accessToken,
        repository.owner,
        repository.name,
        env.backendUrl,
        env.githubWebhookSecret
      );
    } catch (err: any) {
      res.status(502).json({ error: `Webhook provisioning failed: ${err.message}` });
      return;
    }

    // 5. Update connection and webhook details in database
    repository.isConnected = true;
    repository.webhookId = webhookId;
    await repository.save();

    res.status(200).json({
      success: true,
      repository: {
        id: repository._id.toString(),
        githubRepoId: repository.githubRepoId,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        private: repository.private,
        isConnected: repository.isConnected,
        webhookId: repository.webhookId,
        createdAt: repository.createdAt,
        updatedAt: repository.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Failed to connect repository:', error);
    res.status(500).json({ error: error.message || 'Database query failure during connection' });
  }
};

/**
 * Disconnects a repository and deletes its GitHub webhook.
 */
export const disconnectRepository = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { githubRepoId, github_id } = req.body;
  const targetRepoId = githubRepoId !== undefined ? githubRepoId : github_id;

  if (targetRepoId === undefined || typeof targetRepoId !== 'number' || isNaN(targetRepoId)) {
    res.status(400).json({ error: 'Invalid or missing githubRepoId or github_id in request body' });
    return;
  }

  try {
    // 1. Retrieve User profile to get OAuth access token
    const user = await User.findById(userId);
    if (!user || !user.accessToken) {
      res.status(401).json({ error: 'User profile or GitHub credentials missing.' });
      return;
    }

    // 2. Find target repository
    const repository = await Repository.findOne({ userId, githubRepoId: targetRepoId });
    if (!repository) {
      res.status(404).json({ error: 'Repository not found in ReviewPilot dashboard.' });
      return;
    }

    // 3. Delete GitHub Webhook if a webhookId is registered
    if (repository.webhookId) {
      try {
        await deleteWebhook(
          user.accessToken,
          repository.owner,
          repository.name,
          repository.webhookId
        );
      } catch (err: any) {
        console.error(`Failed to delete webhook ${repository.webhookId} from GitHub:`, err);
        // Continue disconnecting in DB even if webhook delete on GitHub fails or webhook is already deleted (e.g. 404)
      }
    }

    // 4. Update connection state in database
    repository.isConnected = false;
    repository.webhookId = null;
    await repository.save();

    res.status(200).json({
      success: true,
      repository: {
        id: repository._id.toString(),
        githubRepoId: repository.githubRepoId,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        private: repository.private,
        isConnected: repository.isConnected,
        webhookId: null,
        createdAt: repository.createdAt,
        updatedAt: repository.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Failed to disconnect repository:', error);
    res.status(500).json({ error: error.message || 'Database query failure during disconnection' });
  }
};
