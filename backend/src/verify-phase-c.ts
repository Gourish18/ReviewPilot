import { app } from './app.js';
import http from 'http';

async function runVerification() {
  console.log('--- Phase C.1 OAuth Route Foundation Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // 1. Test GET /api/auth/login
    console.log('\n[1] Testing GET /api/auth/login redirect...');
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      redirect: 'manual', // do not follow redirect so we can inspect headers
    });
    console.log('Response Status:', loginRes.status);
    const location = loginRes.headers.get('location');
    console.log('Redirect Location:', location);
    if (loginRes.status === 302 && location && location.startsWith('https://github.com/login/oauth/authorize')) {
      console.log('SUCCESS: Redirected to GitHub OAuth authorization endpoint as expected.');
      console.log('Generated OAuth URL Example:', location);
    } else {
      throw new Error(`FAIL: Unexpected login response. Status: ${loginRes.status}, Location: ${location}`);
    }

    // 2. Test GET /api/auth/github/callback (missing code)
    console.log('\n[2] Testing GET /api/auth/github/callback with missing code...');
    const badCallbackRes = await fetch(`http://localhost:${PORT}/api/auth/github/callback`);
    console.log('Response Status (Expected 400):', badCallbackRes.status);
    const badJson: any = await badCallbackRes.json();
    console.log('Response Body:', JSON.stringify(badJson));
    if (badCallbackRes.status === 400 && badJson.error === 'Missing authorization code') {
      console.log('SUCCESS: Returned 400 Bad Request with correct error message.');
    } else {
      throw new Error(`FAIL: Unexpected bad callback response. Status: ${badCallbackRes.status}, Body: ${JSON.stringify(badJson)}`);
    }

    // 3. Test GET /api/auth/github/callback (with code)
    console.log('\n[3] Testing GET /api/auth/github/callback with code=test123...');
    const goodCallbackRes = await fetch(`http://localhost:${PORT}/api/auth/github/callback?code=test123`);
    console.log('Response Status (Expected 200):', goodCallbackRes.status);
    const goodJson: any = await goodCallbackRes.json();
    console.log('Response Body:', JSON.stringify(goodJson));
    if (goodCallbackRes.status === 200 && goodJson.success === true && goodJson.code === 'test123') {
      console.log('SUCCESS: Returned 200 OK with success indicator and code.');
    } else {
      throw new Error(`FAIL: Unexpected successful callback response. Status: ${goodCallbackRes.status}, Body: ${JSON.stringify(goodJson)}`);
    }

    console.log('\nAll tests passed successfully!');

  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nShutting down test server...');
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Test server closed.');
        resolve();
      });
    });
  }
}

void runVerification();
