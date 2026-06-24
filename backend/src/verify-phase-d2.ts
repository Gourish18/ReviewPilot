import { app } from './app.js';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';

async function runVerification() {
  console.log('--- Phase D.2 Complete Authentication Flow Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  // Connect to DB and wait for indexes to build
  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  console.log('Database connected & indexes initialized.');

  // Clean up previous test entries
  console.log('Cleaning up previous test users...');
  await User.deleteMany({ githubId: { $in: [999999, 999995] } });

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Successful OAuth flow
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing successful mock OAuth callback flow...');
    const url1 = `http://localhost:${PORT}/api/auth/github/callback?code=testcode123&mock_flow=true&mock_github_id=999999&mock_username=mock-user-pilot&mock_email=mock@reviewpilot.com`;
    const res1 = await fetch(url1, { redirect: 'manual' });
    
    console.log('Response Status (Expected 302):', res1.status);
    const redirectLocation = res1.headers.get('location');
    console.log('Redirect Location:', redirectLocation);

    if (res1.status !== 302 || !redirectLocation || !redirectLocation.includes('/auth/callback?token=')) {
      throw new Error(`FAIL: Test 1 redirect failed. Location: ${redirectLocation}`);
    }

    const createdUser = await User.findOne({ githubId: 999999 });
    if (!createdUser) {
      throw new Error('FAIL: Test 1 User not persisted in MongoDB!');
    }
    console.log('Persisted User in DB:', createdUser.toJSON());
    console.log('SUCCESS: User saved, JWT generated, and correct redirect occurred.');

    // -------------------------------------------------------------
    // Test 2: Invalid code (Missing code)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing missing code returns HTTP 400...');
    const url2 = `http://localhost:${PORT}/api/auth/github/callback`;
    const res2 = await fetch(url2);
    console.log('Response Status (Expected 400):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));
    if (res2.status === 400 && body2.error === 'Missing authorization code') {
      console.log('SUCCESS: Returned HTTP 400 with expected error message.');
    } else {
      throw new Error(`FAIL: Missing code validation. Status: ${res2.status}, Body: ${JSON.stringify(body2)}`);
    }

    // -------------------------------------------------------------
    // Test 3: GitHub rejects code (live route flow with invalid code)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing live callback handling when GitHub rejects code...');
    const url3 = `http://localhost:${PORT}/api/auth/github/callback?code=rejected_code_xyz`;
    const res3 = await fetch(url3);
    console.log('Response Status (Expected 400 or 500):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));
    if (res3.status >= 400 && body3.error) {
      console.log('SUCCESS: Handled error response properly without server crash.');
    } else {
      throw new Error(`FAIL: GitHub rejection error not handled correctly. Status: ${res3.status}`);
    }

    // -------------------------------------------------------------
    // Test 4: Existing user logs in again
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing existing user logging in again (Updates, no duplicates)...');
    const url4 = `http://localhost:${PORT}/api/auth/github/callback?code=testcode123&mock_flow=true&mock_github_id=999999&mock_username=mock-user-updated&mock_email=updated@reviewpilot.com`;
    const res4 = await fetch(url4, { redirect: 'manual' });
    console.log('Response Status (Expected 302):', res4.status);

    const usersCount = await User.countDocuments({ githubId: 999999 });
    const updatedUser = await User.findOne({ githubId: 999999 });

    if (usersCount !== 1) {
      throw new Error(`FAIL: Found ${usersCount} users with githubId 999999! Expected exactly 1.`);
    }
    if (updatedUser?.username !== 'mock-user-updated' || updatedUser?.email !== 'updated@reviewpilot.com') {
      throw new Error(`FAIL: User document not updated! User: ${JSON.stringify(updatedUser)}`);
    }
    console.log('Updated User in DB:', updatedUser.toJSON());
    console.log('SUCCESS: Existing user updated details cleanly. No duplicate records.');

    // -------------------------------------------------------------
    // Test 5: Concurrent login simulation
    // -------------------------------------------------------------
    console.log('\n[Test 5] Simulating concurrent logins (upsert safety check)...');
    const concurrentGithubId = 999995;
    const requests = Array.from({ length: 5 }).map((_, i) => {
      const url = `http://localhost:${PORT}/api/auth/github/callback?code=testcode123&mock_flow=true&mock_github_id=${concurrentGithubId}&mock_username=concurrent-user-${i}&mock_email=concurrent-${i}@reviewpilot.com`;
      return fetch(url, { redirect: 'manual' });
    });

    const responses = await Promise.all(requests);
    console.log('Responses Status codes (All expected 302):', responses.map(r => r.status));

    const concurrentUsersCount = await User.countDocuments({ githubId: concurrentGithubId });
    console.log('Count of concurrent users in DB (Expected 1):', concurrentUsersCount);

    if (concurrentUsersCount !== 1) {
      throw new Error(`FAIL: Concurrency duplicate found! Created ${concurrentUsersCount} records for githubId ${concurrentGithubId}.`);
    }
    console.log('SUCCESS: Atomic upsert successfully prevented creation of duplicate users during concurrent requests.');

    console.log('\nAll complete auth flow tests passed successfully!');

  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    // Clean up test users
    console.log('\nCleaning up database test users...');
    await User.deleteMany({ githubId: { $in: [999999, 999995] } });
    console.log('Database cleaned.');

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
