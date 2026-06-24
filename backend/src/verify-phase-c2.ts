import { exchangeCodeForToken, getGithubUser } from './services/githubOAuth.service.js';

async function runVerification() {
  console.log('--- Phase C.2 GitHub OAuth Service Layer Verification ---');

  // Test 1: exchangeCodeForToken() with an invalid code
  console.log('\n[Test 1] Testing exchangeCodeForToken with an invalid/mock code...');
  try {
    const token = await exchangeCodeForToken('invalid_code_xyz123');
    console.error('FAIL: Expected token exchange to throw an error for invalid code, but it returned a token:', token);
    process.exitCode = 1;
  } catch (err: any) {
    console.log('SUCCESS: exchangeCodeForToken threw an error for invalid code as expected.');
    console.log('Error message:', err.message);
    if (err.message.includes('GitHub error') || err.message.includes('token exchange failed')) {
      console.log('SUCCESS: Error details match expectations.');
    } else {
      console.warn('WARNING: Unexpected error details:', err.message);
    }
  }

  // Test 2: getGithubUser() with an invalid token
  console.log('\n[Test 2] Testing getGithubUser with an invalid token...');
  try {
    const user = await getGithubUser('invalid_token_abc789');
    console.error('FAIL: Expected user fetch to throw an error for invalid token, but it returned user:', user);
    process.exitCode = 1;
  } catch (err: any) {
    console.log('SUCCESS: getGithubUser threw an error for invalid token as expected.');
    console.log('Error message:', err.message);
    if (err.message.includes('retrieval failed') || err.message.includes('Failed to fetch user profile')) {
      console.log('SUCCESS: Error details match expectations.');
    } else {
      console.warn('WARNING: Unexpected error details:', err.message);
    }
  }

  console.log('\nVerification complete.');
}

void runVerification();
