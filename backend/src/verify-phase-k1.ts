import { app } from './app.js';
import http from 'http';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { Review } from './models/Review.js';
import { generateToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- Phase K.1 Review Detail API Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  await Review.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test records...');
  await User.deleteMany({ githubId: { $in: [222221, 222222] } });
  await Repository.deleteMany({ githubRepoId: { $in: [33001] } });
  await Review.deleteMany({ prNumber: 8001 });

  // 1. Seed two mock Users
  console.log('Seeding test users...');
  const alice = await User.create({
    githubId: 222221,
    username: 'alice-detail',
    email: 'alice-detail@reviewpilot.com',
    accessToken: 'mock_token_alice',
  });

  const bob = await User.create({
    githubId: 222222,
    username: 'bob-detail',
    email: 'bob-detail@reviewpilot.com',
    accessToken: 'mock_token_bob',
  });

  // 2. Seed mock Repository
  console.log('Seeding test repository...');
  const repo = await Repository.create({
    userId: alice._id,
    githubRepoId: 33001,
    owner: 'alice-detail',
    name: 'alice-project-detail',
    fullName: 'alice-detail/alice-project-detail',
    private: false,
    isConnected: true,
  });

  // 3. Seed mock Review with findings and report
  console.log('Seeding test review...');
  const review = await Review.create({
    userId: alice._id,
    repositoryId: repo._id,
    prNumber: 8001,
    prTitle: 'feat: add detailed review integrations',
    commitSha: 'd1e2f3a4b5c6',
    triageCategory: 'backend',
    status: 'completed',
    securityFindings: ['Hardcoded secret key in app.ts'],
    logicFindings: ['Missing async exception catch wrapper'],
    markdownReport: '# E2E Automated Code Review\n\n- Fix secret key in app.ts\n- Wrap async routines.',
  });

  // Generate tokens
  const aliceToken = generateToken(alice._id.toString());
  const bobToken = generateToken(bob._id.toString());
  const reviewId = review._id.toString();

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Valid ID & Ownership Check (Expected: 200)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing successful review retrieval by authenticated owner (Alice)...');
    const res1 = await fetch(`http://localhost:${PORT}/api/reviews/${reviewId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
      },
    });

    console.log('Response Status (Expected 200):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body Keys:', Object.keys(body1));
    console.log('Triage Category:', body1.triageCategory);
    console.log('Security Findings:', body1.securityFindings);
    console.log('Logic Findings:', body1.logicFindings);
    console.log('Has Full Markdown Report:', !!body1.markdownReport);
    console.log('Populated Repo Full Name:', body1.repositoryFullName);

    if (
      res1.status === 200 &&
      body1.id === reviewId &&
      body1.markdownReport.includes('# E2E Automated Code Review') &&
      body1.repositoryFullName === 'alice-detail/alice-project-detail'
    ) {
      console.log('SUCCESS: Successfully retrieved complete review details by owner with correct fields and population.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Invalid ObjectId Format (Expected: 400)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing retrieval with malformed ObjectId format...');
    const res2 = await fetch(`http://localhost:${PORT}/api/reviews/invalid-id-12345`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
      },
    });

    console.log('Response Status (Expected 400):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));

    if (res2.status === 400 && body2.error.includes('Invalid review ID')) {
      console.log('SUCCESS: Malformed ID correctly rejected with 400 Bad Request.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Review Not Owned (Expected: 404)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing cross-tenant access restriction (Bob requesting Alice\'s review)...');
    const res3 = await fetch(`http://localhost:${PORT}/api/reviews/${reviewId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bobToken}`,
      },
    });

    console.log('Response Status (Expected 404):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));

    if (res3.status === 404 && body3.error.includes('Review not found')) {
      console.log('SUCCESS: Unauthorized tenant access correctly rejected with 404 Not Found to prevent identity leakage.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Status: ${res3.status}`);
    }

    // -------------------------------------------------------------
    // Test 4: Unauthenticated Request (Expected: 401)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing retrieval without JWT token...');
    const res4 = await fetch(`http://localhost:${PORT}/api/reviews/${reviewId}`, {
      method: 'GET',
    });

    console.log('Response Status (Expected 401):', res4.status);
    if (res4.status === 401) {
      console.log('SUCCESS: Unauthenticated request correctly blocked with 401 Unauthorized.');
    } else {
      throw new Error(`FAIL: Test 4 failed. Status: ${res4.status}`);
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Review.deleteMany({ prNumber: 8001 });
    await Repository.deleteMany({ githubRepoId: { $in: [33001] } });
    await User.deleteMany({ githubId: { $in: [222221, 222222] } });
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
