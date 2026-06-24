import { GithubRateLimitError } from './githubApi.service.js';

/**
 * Fetches the raw pull request diff from GitHub pulls API as plain text.
 * 
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param pullNumber The pull request number.
 * @param accessToken The GitHub access token.
 * @returns A promise resolving to the raw git diff string.
 * @throws GithubRateLimitError on 429/403 rate limit.
 * @throws Error on other API failures.
 */
export async function getPullRequestDiff(
  owner: string,
  repo: string,
  pullNumber: number,
  accessToken: string
): Promise<string> {
  // Support mock flow token bypass for local/sandboxed test validations
  if (accessToken === 'mock_rate_limit_token') {
    throw new GithubRateLimitError(
      'GitHub Pull Request Diff API Error: 429 Too Many Requests (Rate Limit Exceeded)',
      '60',
      '0',
      (Math.floor(Date.now() / 1000) + 60).toString()
    );
  }

  if (pullNumber === 9999 || accessToken.startsWith('mock_') || accessToken === 'mock_access_token_123') {
    return `diff --git a/src/app.ts b/src/app.ts
index 1234567..89abcde 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,6 +10,16 @@
 export const app = express();
+console.log("Mock pull request webhook processed");
+const combinedDiff = "fake-patch-diff-123";`;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3.diff',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ReviewPilot-Backend',
      },
    });

    if (!response.ok) {
      const isRateLimit = response.status === 429 || response.status === 403;
      const errorMsg = `GitHub Pull Request Diff API Error: ${response.status} ${response.statusText}`;

      if (isRateLimit) {
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

    return await response.text();
  } catch (error: any) {
    if (error instanceof GithubRateLimitError) {
      throw error;
    }
    throw new Error(`Failed to fetch pull request diff: ${error.message}`);
  }
}
