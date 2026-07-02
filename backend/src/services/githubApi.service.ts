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

/**
 * Checks for an existing ReviewPilot webhook on GitHub, creates one if missing, or updates it if found.
 * Returns the GitHub webhook ID.
 */
export async function createOrUpdateWebhook(
  accessToken: string,
  owner: string,
  repoName: string,
  backendUrl: string,
  webhookSecret: string
): Promise<number> {
  if (accessToken.startsWith('mock_')) {
    console.log('[Mock GitHub API] Simulating webhook creation');
    return 123456789;
  }

  const payloadUrl = `${backendUrl}/api/webhooks/github`;
  const listUrl = `https://api.github.com/repos/${owner}/${repoName}/hooks?per_page=100`;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ReviewPilot-Backend',
  };

  // 1. Check if webhook already exists
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    throw new Error(`GitHub API error listing webhooks: ${listRes.status} ${listRes.statusText}`);
  }

  const hooks = (await listRes.json()) as any[];
  const existingHook = hooks.find(h => h.config && h.config.url === payloadUrl);

  if (existingHook) {
    console.log(`Webhook already exists for ${owner}/${repoName} with ID ${existingHook.id}. Updating configuration...`);
    
    // Update existing webhook
    const updateUrl = `https://api.github.com/repos/${owner}/${repoName}/hooks/${existingHook.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          url: payloadUrl,
          content_type: 'application/json',
          secret: webhookSecret,
          insecure_ssl: '0', // SSL verification enabled
        },
        events: ['pull_request'],
        active: true,
      }),
    });

    if (!updateRes.ok) {
      throw new Error(`GitHub API error updating webhook: ${updateRes.status} ${updateRes.statusText}`);
    }

    return existingHook.id;
  }

  // 2. Create new webhook
  console.log(`Creating new webhook for ${owner}/${repoName}...`);
  const createUrl = `https://api.github.com/repos/${owner}/${repoName}/hooks`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['pull_request'],
      config: {
        url: payloadUrl,
        content_type: 'application/json',
        secret: webhookSecret,
        insecure_ssl: '0',
      },
    }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text().catch(() => '');
    throw new Error(`GitHub API error creating webhook: ${createRes.status} ${createRes.statusText}. Details: ${errorBody}`);
  }

  const newHook = await createRes.json();
  return newHook.id;
}

/**
 * Deletes a registered webhook from GitHub.
 */
export async function deleteWebhook(
  accessToken: string,
  owner: string,
  repoName: string,
  webhookId: number
): Promise<void> {
  if (accessToken.startsWith('mock_')) {
    console.log('[Mock GitHub API] Simulating webhook deletion');
    return;
  }

  const deleteUrl = `https://api.github.com/repos/${owner}/${repoName}/hooks/${webhookId}`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ReviewPilot-Backend',
  };

  const deleteRes = await fetch(deleteUrl, {
    method: 'DELETE',
    headers,
  });

  if (!deleteRes.ok && deleteRes.status !== 404) {
    throw new Error(`GitHub API error deleting webhook: ${deleteRes.status} ${deleteRes.statusText}`);
  }
}
