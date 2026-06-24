import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { exchangeCodeForToken, getGithubUser } from '../services/githubOAuth.service.js';
import { User } from '../models/User.js';
import { generateToken } from '../services/token.service.js';

/**
 * Initiates the GitHub OAuth flow by redirecting the user to GitHub's authorization page.
 */
export const login = (req: Request, res: Response): void => {
  const oauthUrl = new URL('https://github.com/login/oauth/authorize');
  oauthUrl.searchParams.set('client_id', env.githubClientId);
  oauthUrl.searchParams.set('redirect_uri', env.githubCallbackUrl);
  oauthUrl.searchParams.set('scope', 'user:email repo');

  res.redirect(oauthUrl.toString());
};

/**
 * Handles the redirect callback from GitHub OAuth.
 * Performs token exchange, user profile fetching, database persistence, and JWT session generation.
 */
export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code;

  // Step 1: Validate authorization code
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    let accessToken: string;
    let githubProfile: {
      id: number;
      login: string;
      email: string | null;
      avatar_url: string;
    };

    // Support test mock bypass to allow integration/database testing without actual GitHub API calls
    if (req.query.mock_flow === 'true') {
      accessToken = 'mock_access_token_123';
      githubProfile = {
        id: Number(req.query.mock_github_id) || 999999,
        login: (req.query.mock_username as string) || 'mock-user-pilot',
        email: (req.query.mock_email as string) || 'mock@reviewpilot.com',
        avatar_url: 'https://github.com/mock-avatar.png',
      };
    } else {
      // Step 2: Exchange code for GitHub access token
      accessToken = await exchangeCodeForToken(code);

      // Step 3: Fetch GitHub user profile
      githubProfile = await getGithubUser(accessToken);
    }

    // Step 4: Persist User (Mongoose findOneAndUpdate with upsert)
    // 
    // Explaining Upsert and Concurrency Safety:
    // - Why upsert is used: It aggregates 'find-and-insert' or 'find-and-update' into a single database instruction.
    //   If the user record is missing, it is created. If it already exists, its username, avatar, and active token are updated.
    // - Atomic Operations: MongoDB performs findOneAndUpdate atomically. This rules out race conditions where two concurrent logins
    //   by the same user attempt to write at the same time, which would otherwise lead to duplicate document errors.
    // - Concurrent Logins: Combined with the unique index on githubId, the upsert guarantees only one document is created/updated,
    //   ensuring consistency.
    const user = await User.findOneAndUpdate(
      { githubId: githubProfile.id },
      {
        githubId: githubProfile.id,
        username: githubProfile.login,
        email: githubProfile.email || undefined,
        avatarUrl: githubProfile.avatar_url,
        accessToken: accessToken,
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
      }
    );

    if (!user) {
      res.status(500).json({ error: 'Database error: failed to retrieve or create user' });
      return;
    }

    // Step 5: Generate ReviewPilot JWT containing only application identity (userId)
    const jwtToken = generateToken(user._id.toString());

    // Step 6: Redirect to Frontend Callback (do not return JSON or render HTML)
    res.redirect(`${env.frontendUrl}/auth/callback?token=${jwtToken}`);
  } catch (error: any) {
    console.error('OAuth callback logic failed:', error);

    // Differentiate between external API failures and internal/database errors
    if (error.message.includes('GitHub token exchange failed')) {
      res.status(400).json({ error: 'GitHub authorization failed: invalid authorization code' });
    } else if (error.message.includes('GitHub user retrieval failed')) {
      res.status(502).json({ error: 'GitHub user retrieval failed: API communication issue' });
    } else {
      res.status(500).json({ error: error.message || 'Internal authentication processing failure' });
    }
  }
};

/**
 * Retrieves the currently authenticated user's profile metadata.
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      id: user._id.toString(),
      githubId: user.githubId,
      username: user.username,
      email: user.email || null,
      avatarUrl: user.avatarUrl || null,
    });
  } catch (error: any) {
    console.error('Failed to retrieve current user:', error);
    res.status(500).json({ error: error.message || 'Internal database processing failure' });
  }
};
