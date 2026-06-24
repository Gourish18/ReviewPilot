import { app } from './app.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { generateToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- Phase D.3 Authentication Middleware Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  const testUserId = 'user_6a2f7040b563dc3798ae8265';
  const validToken = generateToken(testUserId);

  // Expired token signed with past iat (issued at)
  const pastIat = Math.floor(Date.now() / 1000) - 100;
  const expiredToken = jwt.sign(
    { userId: testUserId, iat: pastIat },
    env.jwtSecret,
    { expiresIn: '10s' }
  );

  try {
    // Test 1: No Authorization header
    console.log('\n[Test 1] Testing route without Authorization header...');
    const res1 = await fetch(`http://localhost:${PORT}/api/test/protected`);
    console.log('Response Status (Expected 401):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body:', JSON.stringify(body1));
    if (res1.status === 401 && body1.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected without header.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}, Body: ${JSON.stringify(body1)}`);
    }

    // Test 2: Malformed header
    console.log('\n[Test 2] Testing route with malformed Authorization header...');
    const res2 = await fetch(`http://localhost:${PORT}/api/test/protected`, {
      headers: { 'Authorization': `BearerToken ${validToken}` }
    });
    console.log('Response Status (Expected 401):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));
    if (res2.status === 401 && body2.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected malformed header.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}, Body: ${JSON.stringify(body2)}`);
    }

    // Test 3: Invalid token
    console.log('\n[Test 3] Testing route with invalid/tampered token...');
    const res3 = await fetch(`http://localhost:${PORT}/api/test/protected`, {
      headers: { 'Authorization': `Bearer ${validToken}_tampered` }
    });
    console.log('Response Status (Expected 401):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));
    if (res3.status === 401 && body3.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected invalid signature token.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Status: ${res3.status}, Body: ${JSON.stringify(body3)}`);
    }

    // Test 4: Expired token
    console.log('\n[Test 4] Testing route with expired token...');
    const res4 = await fetch(`http://localhost:${PORT}/api/test/protected`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    console.log('Response Status (Expected 401):', res4.status);
    const body4 = await res4.json() as any;
    console.log('Response Body:', JSON.stringify(body4));
    if (res4.status === 401 && body4.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected expired token.');
    } else {
      throw new Error(`FAIL: Test 4 failed. Status: ${res4.status}, Body: ${JSON.stringify(body4)}`);
    }

    // Test 5: Valid token
    console.log('\n[Test 5] Testing route with valid token...');
    const res5 = await fetch(`http://localhost:${PORT}/api/test/protected`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    console.log('Response Status (Expected 200):', res5.status);
    const body5 = await res5.json() as any;
    console.log('Response Body:', JSON.stringify(body5));
    if (res5.status === 200 && body5.message === 'Authenticated' && body5.userId === testUserId) {
      console.log('SUCCESS: Middleware validated token, attached userId to request, and allowed proceeding.');
    } else {
      throw new Error(`FAIL: Test 5 failed. Status: ${res5.status}, Body: ${JSON.stringify(body5)}`);
    }

    console.log('\nAll auth middleware tests passed successfully!');

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
