/**
 * Interface representing a GitHub repository item returned by the GitHub API.
 */
export interface IGithubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
    [key: string]: any;
  };
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string;
}

/**
 * Custom error class raised when GitHub API returns a rate limit block (HTTP 403 / 429).
 */
export class GithubRateLimitError extends Error {
  public limit: number | null = null;
  public remaining: number | null = null;
  public resetTime: Date | null = null;

  constructor(
    message: string,
    limitHeader?: string | null,
    remainingHeader?: string | null,
    resetHeader?: string | null
  ) {
    super(message);
    this.name = 'GithubRateLimitError';

    if (limitHeader) this.limit = parseInt(limitHeader, 10);
    if (remainingHeader) this.remaining = parseInt(remainingHeader, 10);
    if (resetHeader) {
      const resetUnixSeconds = parseInt(resetHeader, 10);
      if (!isNaN(resetUnixSeconds)) {
        this.resetTime = new Date(resetUnixSeconds * 1000);
      }
    }
  }
}

/**
 * Fetches the repositories belonging to the authenticated user from GitHub.
 * 
 * @param accessToken The GitHub access token.
 * @returns A promise resolving to an array of raw IGithubRepository objects.
 * @throws GithubRateLimitError if rate limits are exceeded.
 * @throws Error if network fails or any non-OK HTTP status is returned.
 */
export async function fetchUserRepositories(accessToken: string): Promise<IGithubRepository[]> {
  // Support mock flow token bypass to allow frontend interaction and testing without live GitHub credentials
  if (accessToken.startsWith('mock_') || accessToken === 'mock_access_token_123') {
    return [
      {
        id: 10001,
        name: 'react-app-demo',
        full_name: 'mock-user-pilot/react-app-demo',
        owner: { login: 'mock-user-pilot', avatar_url: 'https://github.com/mock-avatar.png' },
        private: false,
        description: 'A React application demo for review verification.',
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
      },
      {
        id: 10002,
        name: 'express-review-service',
        full_name: 'mock-user-pilot/express-review-service',
        owner: { login: 'mock-user-pilot', avatar_url: 'https://github.com/mock-avatar.png' },
        private: true,
        description: 'Review backend middleware services.',
        language: 'JavaScript',
        updated_at: new Date().toISOString(),
      },
      {
        id: 10003,
        name: 'nextjs-saas-template',
        full_name: 'mock-user-pilot/nextjs-saas-template',
        owner: { login: 'mock-user-pilot', avatar_url: 'https://github.com/mock-avatar.png' },
        private: false,
        description: 'A production-ready Next.js SaaS starter template.',
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
      },
      {
        id: 10004,
        name: 'python-utility-scripts',
        full_name: 'mock-user-pilot/python-utility-scripts',
        owner: { login: 'mock-user-pilot', avatar_url: 'https://github.com/mock-avatar.png' },
        private: false,
        description: 'Collection of basic data science helper utilities.',
        language: 'Python',
        updated_at: new Date().toISOString(),
      }
    ];
  }

  try {
    const url = 'https://api.github.com/user/repos?sort=updated&per_page=100';

    // Headers Explanation:
    // 1. Authorization: Bearer <accessToken>
    //    Why it exists: Authenticates the request on behalf of the user, granting access to private/public repositories.
    // 2. Accept: application/vnd.github+json
    //    Why it exists: Tells GitHub to return responses using the official v3 JSON schema format contract.
    // 3. X-GitHub-Api-Version: 2022-11-28
    //    Why it exists: Specifies the target API version, protecting the codebase against sudden breaking changes if GitHub updates APIs.
    // 4. User-Agent: ReviewPilot-Backend
    //    Why it exists: GitHub blocks requests without User-Agent headers (HTTP 403 Forbidden) to combat anonymous scripts and abuse.
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ReviewPilot-Backend',
      },
    });

    if (!response.ok) {
      const isRateLimit = response.status === 429 || response.status === 403;
      const errorMsg = `GitHub API Error: ${response.status} ${response.statusText}`;

      if (isRateLimit) {
        // Extract rate limiting headers if available to help downstreams schedule retries
        const limit = response.headers.get('x-ratelimit-limit');
        const remaining = response.headers.get('x-ratelimit-remaining');
        const reset = response.headers.get('x-ratelimit-reset');

        throw new GithubRateLimitError(
          `${errorMsg} (Rate Limit Exceeded)`,
          limit,
          remaining,
          reset
        );
      }

      throw new Error(errorMsg);
    }

    const repos = (await response.json()) as IGithubRepository[];
    return repos;
  } catch (error: any) {
    if (error instanceof GithubRateLimitError) {
      throw error;
    }
    throw new Error(`Failed to fetch user repositories: ${error.message}`);
  }
}
