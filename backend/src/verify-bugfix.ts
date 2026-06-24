import { app } from './app.js';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { generateToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- GET /api/auth/me Bug Fix Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test users...');
  await User.deleteMany({ githubId: 888888 });

  // Create a mock User
  console.log('Creating test user...');
  const testUser = await User.create({
    githubId: 888888,
    username: 'me-endpoint-pilot',
    email: 'me@reviewpilot.com',
    avatarUrl: 'https://github.com/avatar.png',
  });
  const userIdStr = testUser._id.toString();
  const validToken = generateToken(userIdStr);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // Test 1: No Authorization token
    console.log('\n[Test 1] Testing GET /api/auth/me without token...');
    const res1 = await fetch(`http://localhost:${PORT}/api/auth/me`);
    console.log('Response Status (Expected 401):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body:', JSON.stringify(body1));
    if (res1.status === 401 && body1.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected without token.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}`);
    }

    // Test 2: Invalid Authorization token
    console.log('\n[Test 2] Testing GET /api/auth/me with invalid token...');
    const res2 = await fetch(`http://localhost:${PORT}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${validToken}_tampered` }
    });
    console.log('Response Status (Expected 401):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));
    if (res2.status === 401 && body2.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected invalid token.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}`);
    }

    // Test 3: Valid Authorization token
    console.log('\n[Test 3] Testing GET /api/auth/me with valid token...');
    const res3 = await fetch(`http://localhost:${PORT}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    console.log('Response Status (Expected 200):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));
    if (
      res3.status === 200 &&
      body3.id === userIdStr &&
      body3.githubId === 888888 &&
      body3.username === 'me-endpoint-pilot' &&
      body3.email === 'me@reviewpilot.com' &&
      body3.avatarUrl === 'https://github.com/avatar.png'
    ) {
      console.log('SUCCESS: Successfully fetched and mapped user profile details.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Status: ${res3.status}, Body: ${JSON.stringify(body3)}`);
    }

    // Test 4: User deleted from DB
    console.log('\n[Test 4] Testing GET /api/auth/me after user is deleted from MongoDB...');
    await User.deleteOne({ _id: testUser._id });
    const res4 = await fetch(`http://localhost:${PORT}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    console.log('Response Status (Expected 404):', res4.status);
    const body4 = await res4.json() as any;
    console.log('Response Body:', JSON.stringify(body4));
    if (res4.status === 404 && body4.error === 'User not found') {
      console.log('SUCCESS: Returned 404 User not found as expected.');
    } else {
      throw new Error(`FAIL: Test 4 failed. Status: ${res4.status}, Body: ${JSON.stringify(body4)}`);
    }

    console.log('\nAll /api/auth/me tests passed successfully!');

  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    // Cleanup remaining test users
    console.log('\nCleaning up verification database test records...');
    await User.deleteMany({ githubId: 888888 });
    console.log('Cleanup finished.');

    console.log('Disconnecting from database...');
    await disconnectDatabase();

    console.log('Shutting down test server...');
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Test server closed.');
        resolve();
      });
    });
  }
}

void runVerification();
