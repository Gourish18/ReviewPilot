import { app } from './app.js';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { Review } from './models/Review.js';
import { generateToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- Phase J.1 Reviews API Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  await Review.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test records...');
  await User.deleteMany({ githubId: { $in: [333331, 333332] } });
  await Repository.deleteMany({ githubRepoId: { $in: [44001, 44002] } });
  await Review.deleteMany({ prNumber: { $in: [7001, 7002, 7003, 7004] } });

  // 1. Seed two mock Users
  console.log('Seeding test users...');
  const user1 = await User.create({
    githubId: 333331,
    username: 'user-alice',
    email: 'alice@reviewpilot.com',
    accessToken: 'mock_access_token_alice',
  });

  const user2 = await User.create({
    githubId: 333332,
    username: 'user-bob',
    email: 'bob@reviewpilot.com',
    accessToken: 'mock_access_token_bob',
  });

  // 2. Seed mock Repositories
  console.log('Seeding test repositories...');
  const repo1 = await Repository.create({
    userId: user1._id,
    githubRepoId: 44001,
    owner: 'user-alice',
    name: 'alice-project',
    fullName: 'user-alice/alice-project',
    private: false,
    isConnected: true,
  });

  const repo2 = await Repository.create({
    userId: user1._id,
    githubRepoId: 44002,
    owner: 'user-alice',
    name: 'alice-web',
    fullName: 'user-alice/alice-web',
    private: false,
    isConnected: true,
  });

  // 3. Seed mock Reviews (staggered creation times)
  console.log('Seeding test reviews...');
  const now = Date.now();

  // Review 1: User 1, Repo 1 (oldest)
  const review1 = await Review.create({
    userId: user1._id,
    repositoryId: repo1._id,
    prNumber: 7001,
    prTitle: 'feat: add buttons',
    status: 'completed',
    triageCategory: 'frontend',
    createdAt: new Date(now - 10000),
    updatedAt: new Date(now - 10000),
  });

  // Review 2: User 1, Repo 2 (medium)
  const review2 = await Review.create({
    userId: user1._id,
    repositoryId: repo2._id,
    prNumber: 7002,
    prTitle: 'feat: add API routes',
    status: 'completed',
    triageCategory: 'backend',
    createdAt: new Date(now - 5000),
    updatedAt: new Date(now - 5000),
  });

  // Review 3: User 1, Repo 1 (newest)
  const review3 = await Review.create({
    userId: user1._id,
    repositoryId: repo1._id,
    prNumber: 7003,
    prTitle: 'fix: resolve race conditions',
    status: 'completed',
    triageCategory: 'backend',
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  // Review 4: User 2, Repo 1 (Bob's review, should NEVER be returned to Alice)
  const review4 = await Review.create({
    userId: user2._id,
    repositoryId: repo1._id,
    prNumber: 7004,
    prTitle: 'security: fix Bob XSS vulnerability',
    status: 'completed',
    triageCategory: 'security',
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  // Generate Alice's session token
  const aliceToken = generateToken(user1._id.toString());

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Without JWT (Expected: 401)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing retrieval without JWT token...');
    const res1 = await fetch(`http://localhost:${PORT}/api/reviews`, {
      method: 'GET',
    });
    console.log('Response Status (Expected 401):', res1.status);
    if (res1.status === 401) {
      console.log('SUCCESS: Blocked unauthenticated access successfully.');
    } else {
      throw new Error(`FAIL: Unauthenticated request returned status: ${res1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: GET /api/reviews (Expected: Returns all Alice reviews)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing retrieval of all user reviews...');
    const res2 = await fetch(`http://localhost:${PORT}/api/reviews`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
      },
    });

    console.log('Response Status (Expected 200):', res2.status);
    const body2 = await res2.json() as any;
    console.log(`Retrieved ${body2.reviews?.length} reviews.`);
    console.log('Pagination Metadata:', JSON.stringify(body2.pagination));

    if (res2.status === 200 && body2.reviews?.length === 3 && body2.pagination?.total === 3) {
      // Ensure bob's review was not leaked
      const bobLeaked = body2.reviews.some((r: any) => r.prNumber === 7004);
      if (bobLeaked) {
        throw new Error('FAIL: Bob\'s private review record was leaked to Alice.');
      }
      
      // Check repository population
      const firstReview = body2.reviews[0];
      if (firstReview.repositoryName && firstReview.repositoryOwner && firstReview.repositoryFullName) {
        console.log('Populated Repository Metadata Example:', {
          name: firstReview.repositoryName,
          owner: firstReview.repositoryOwner,
          fullName: firstReview.repositoryFullName
        });
        console.log('SUCCESS: Retrieved all Alice reviews cleanly, verified no data leaks, and populated repo details.');
      } else {
        throw new Error('FAIL: Repository details were not populated correctly.');
      }
    } else {
      throw new Error(`FAIL: Test 2 failed. Length: ${body2.reviews?.length}`);
    }

    // -------------------------------------------------------------
    // Test 3: Filter by repositoryId (Expected: Only reviews from repo2)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing filter by repositoryId (alice-web)...');
    const res3 = await fetch(`http://localhost:${PORT}/api/reviews?repositoryId=${repo2._id.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
      },
    });

    console.log('Response Status (Expected 200):', res3.status);
    const body3 = await res3.json() as any;
    console.log(`Retrieved ${body3.reviews?.length} reviews for Repo 2.`);

    if (res3.status === 200 && body3.reviews?.length === 1 && body3.reviews[0].prNumber === 7002) {
      console.log('SUCCESS: Filtering by repositoryId operates correctly.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Length: ${body3.reviews?.length}`);
    }

    // -------------------------------------------------------------
    // Test 4: Pagination (Expected: Correct page metadata)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing pagination (page=1, limit=2)...');
    const res4 = await fetch(`http://localhost:${PORT}/api/reviews?page=1&limit=2`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
      },
    });

    console.log('Response Status (Expected 200):', res4.status);
    const body4 = await res4.json() as any;
    console.log(`Retrieved ${body4.reviews?.length} reviews on Page 1.`);
    console.log('Pagination Metadata:', JSON.stringify(body4.pagination));

    if (
      res4.status === 200 &&
      body4.reviews?.length === 2 &&
      body4.pagination.page === 1 &&
      body4.pagination.limit === 2 &&
      body4.pagination.total === 3 &&
      body4.pagination.totalPages === 2
    ) {
      console.log('SUCCESS: Pagination metadata and skipping calculations operate correctly.');
    } else {
      throw new Error('FAIL: Test 4 failed pagination verification.');
    }

    // -------------------------------------------------------------
    // Test 5: Review Sorting (Expected: Newest reviews first)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing sorting order (Newest first)...');
    const res5 = await fetch(`http://localhost:${PORT}/api/reviews`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
      },
    });

    const body5 = await res5.json() as any;
    const reviewPrs = body5.reviews.map((r: any) => r.prNumber);
    console.log('Returned PR Order (Expected [7003, 7002, 7001]):', reviewPrs);

    if (reviewPrs[0] === 7003 && reviewPrs[1] === 7002 && reviewPrs[2] === 7001) {
      console.log('SUCCESS: Sorting order matches descending chronological order.');
    } else {
      throw new Error(`FAIL: Sorting order mismatched. Returned: ${JSON.stringify(reviewPrs)}`);
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Review.deleteMany({ prNumber: { $in: [7001, 7002, 7003, 7004] } });
    await Repository.deleteMany({ githubRepoId: { $in: [44001, 44002] } });
    await User.deleteMany({ githubId: { $in: [333331, 333332] } });
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
