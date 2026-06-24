import { fetchUserRepositories, GithubRateLimitError } from './services/githubApi.service.js';

async function runVerification() {
  console.log('--- Phase E.1 GitHub Repository API Layer Verification ---');

  const originalFetch = globalThis.fetch;

  // Test 1: Invalid token (calling real GitHub API with dummy token)
  console.log('\n[Test 1] Testing fetchUserRepositories with a dummy token (Live API checks)...');
  try {
    await fetchUserRepositories('dummy_bad_token_value_abc123');
    console.error('FAIL: Expected fetchUserRepositories to throw an error for invalid token, but it succeeded.');
    process.exitCode = 1;
  } catch (err: any) {
    console.log('SUCCESS: fetchUserRepositories threw an error for invalid token as expected.');
    console.log('Error message:', err.message);
    if (err.message.includes('GitHub API Error: 401') || err.message.includes('retrieval failed')) {
      console.log('SUCCESS: Error details match expectations.');
    } else {
      console.warn('WARNING: Unexpected error details:', err.message);
    }
  }

  // Test 2: Valid token (Mocked Successful Fetch)
  console.log('\n[Test 2] Testing fetchUserRepositories with a mocked successful response...');
  const mockRepos = [
    {
      id: 54321,
      name: 'reviewpilot-api',
      full_name: 'google-dem/reviewpilot-api',
      owner: { login: 'google-dem', avatar_url: 'https://github.com/avatar.png' },
      private: true,
      description: 'A mock repository for testing',
      language: 'TypeScript',
      updated_at: '2026-06-15T11:00:00Z',
    }
  ];

  globalThis.fetch = async (input, init) => {
    return new Response(JSON.stringify(mockRepos), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  };

  try {
    const repos = await fetchUserRepositories('mock_good_token');
    console.log('Returned Repositories Count:', repos.length);
    console.log('First Repo Item:', repos[0]);
    if (repos.length === 1 && repos[0].id === 54321 && repos[0].name === 'reviewpilot-api') {
      console.log('SUCCESS: Correctly parsed and returned mocked repository array.');
    } else {
      throw new Error(`FAIL: Parsed repository format mismatch. Returned: ${JSON.stringify(repos)}`);
    }
  } catch (err: any) {
    console.error('FAIL: Mocked successful fetch test failed with error:', err.message);
    process.exitCode = 1;
  }

  // Test 3: Rate limit scenario (Mocked 429 Rate Limit Fetch)
  console.log('\n[Test 3] Testing fetchUserRepositories under mocked rate limit (HTTP 429)...');
  
  globalThis.fetch = async (input, init) => {
    const headers = new Headers();
    headers.set('x-ratelimit-limit', '5000');
    headers.set('x-ratelimit-remaining', '0');
    headers.set('x-ratelimit-reset', '1781503200'); // Unix timestamp for 2026-06-15 11:20:00 UTC

    return new Response(JSON.stringify({ message: 'API rate limit exceeded for user ID' }), {
      status: 403,
      statusText: 'Forbidden',
      headers
    });
  };

  try {
    await fetchUserRepositories('mock_rate_limited_token');
    console.error('FAIL: Expected rate limit error to be thrown, but it succeeded.');
    process.exitCode = 1;
  } catch (err: any) {
    if (err instanceof GithubRateLimitError) {
      console.log('SUCCESS: Correctly raised GithubRateLimitError.');
      console.log('Error Message:', err.message);
      console.log('Rate Limit Context - Limit:', err.limit);
      console.log('Rate Limit Context - Remaining:', err.remaining);
      console.log('Rate Limit Context - Reset Time:', err.resetTime);
      if (err.limit === 5000 && err.remaining === 0 && err.resetTime instanceof Date) {
        console.log('SUCCESS: Correctly parsed rate limiting headers.');
      } else {
        console.error('FAIL: Parsed rate limit headers mismatch:', err);
        process.exitCode = 1;
      }
    } else {
      console.error('FAIL: Threw incorrect error type:', err);
      process.exitCode = 1;
    }
  }

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log('\nGitHub API Service checks finished.');
}

void runVerification();
