import { env } from '../config/env.js';

/**
 * Interface representing the structure of a GitHub User Profile returned by the GitHub API.
 */
export interface IGithubUserProfile {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  [key: string]: any; // Allow raw GitHub payload fields through
}

/**
 * Interface representing the JSON response structure from GitHub token exchange.
 */
interface IGithubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * Exchanges a GitHub OAuth authorization code for an access token.
 * 
 * @param code The authorization code received from the GitHub redirect.
 * @returns A promise resolving to the access token string.
 * @throws Error if the request fails, the code is invalid, or no token is returned.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  try {
    // We send Accept: application/json because by default, GitHub returns access token responses
    // as application/x-www-form-urlencoded query strings. Specifying application/json tells GitHub
    // to format the response as JSON for easy parsing.
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ReviewPilot-Backend',
      },
      body: JSON.stringify({
        client_id: env.githubClientId,
        client_secret: env.githubClientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error status ${response.status}`);
    }

    const data = (await response.json()) as IGithubTokenResponse;

    // GitHub returns OAuth errors with HTTP 200 status but containing an error field in the JSON body.
    if (data.error) {
      throw new Error(`GitHub error: ${data.error_description || data.error}`);
    }

    if (!data.access_token) {
      throw new Error('Access token not found in the response payload.');
    }

    return data.access_token;
  } catch (error: any) {
    throw new Error(`GitHub token exchange failed: ${error.message}`);
  }
}

/**
 * Fetches the raw GitHub user profile for the authenticated user.
 * 
 * @param accessToken The GitHub access token.
 * @returns A promise resolving to the raw GitHub user profile JSON object.
 * @throws Error if request fails or token is rejected.
 */
export async function getGithubUser(accessToken: string): Promise<IGithubUserProfile> {
  try {
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'ReviewPilot-Backend', // GitHub API requires a User-Agent header or returns 403.
      },
    });

    if (!response.ok) {
      // Extract detailed error description from GitHub if available
      let errorText = '';
      try {
        const errJson = await response.json() as any;
        errorText = errJson.message ? `: ${errJson.message}` : '';
      } catch {
        errorText = ` (HTTP Status ${response.status})`;
      }
      throw new Error(`Failed to fetch user profile${errorText}`);
    }

    const profile = (await response.json()) as IGithubUserProfile;
    return profile;
  } catch (error: any) {
    throw new Error(`GitHub user retrieval failed: ${error.message}`);
  }
}
