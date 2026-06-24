import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Repository } from '../models/Repository.js';
import { fetchUserRepositories, GithubRateLimitError } from '../services/githubApi.service.js';
import { syncRepositories } from '../services/repositorySync.service.js';

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
 * Connects a repository to activate AI reviews.
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
    const repository = await Repository.findOneAndUpdate(
      { userId, githubRepoId: targetRepoId },
      { isConnected: true },
      { returnDocument: 'after', runValidators: true }
    );

    if (!repository) {
      res.status(404).json({ error: 'Repository not found or access denied' });
      return;
    }

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
        createdAt: repository.createdAt,
        updatedAt: repository.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Failed to connect repository:', error);
    res.status(500).json({ error: 'Database query failure' });
  }
};

/**
 * Disconnects a repository to deactivate AI reviews.
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
    const repository = await Repository.findOneAndUpdate(
      { userId, githubRepoId: targetRepoId },
      { isConnected: false },
      { returnDocument: 'after', runValidators: true }
    );

    if (!repository) {
      res.status(404).json({ error: 'Repository not found or access denied' });
      return;
    }

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
        createdAt: repository.createdAt,
        updatedAt: repository.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Failed to disconnect repository:', error);
    res.status(500).json({ error: 'Database query failure' });
  }
};
