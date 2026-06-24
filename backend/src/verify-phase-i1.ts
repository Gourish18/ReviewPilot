import { postReviewComment } from './services/githubComment.service.js';

async function runVerification() {
  console.log('--- Phase I.1 GitHub Comment Publishing Service Verification ---');

  try {
    // -------------------------------------------------------------
    // Test 1: Mock Comment Publishing (Bypass Flow)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing Mock Comment Publishing (Mock Bypass)...');
    const mockMarkdown = `# Pull Request Review Report\n\n🛡️ **Security**: Passed\n🧠 **Logic**: 2 Improvements suggested.`;
    
    await postReviewComment(
      'octocat',
      'hello-world',
      42,
      mockMarkdown,
      'mock_access_token_123'
    );
    console.log('SUCCESS: Mock comment publishing completed successfully.');

    // -------------------------------------------------------------
    // Test 2: Live API Error Handling (Invalid Token Flow)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing Live API Error Handling with Invalid Token...');
    try {
      await postReviewComment(
        'octocat',
        'hello-world',
        42,
        'This is a test comment',
        'invalid_token_xyz_999'
      );
      throw new Error('FAIL: Service did not throw an error on an invalid token.');
    } catch (err: any) {
      console.log('Caught Expected Error:', err.message);
      if (err.message.includes('GitHub Comment API Error') && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        console.log('SUCCESS: Service correctly formatted and threw the unauthorized API error.');
      } else {
        throw new Error(`FAIL: Unexpected error message returned: ${err.message}`);
      }
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  }
}

void runVerification();
