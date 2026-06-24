import { app } from './app.js';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { generateToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- Phase E.4 Repository Listing API Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test users and repositories...');
  await User.deleteMany({ githubId: 888888 });
  await Repository.deleteMany({ githubRepoId: { $in: [90001, 90002, 90003, 90004, 90005] } });

  // Create a mock User
  console.log('Creating test user...');
  const testUser = await User.create({
    githubId: 888888,
    username: 'test-listing-pilot',
    email: 'list@reviewpilot.com',
  });
  const userIdStr = testUser._id.toString();
  const validToken = generateToken(userIdStr);

  // Seed 5 test repositories with varying states and custom updatedAt timestamps
  console.log('Seeding test repositories with custom update times...');
  const now = Date.now();

  const repoA = await Repository.create({
    userId: testUser._id,
    githubRepoId: 90001,
    owner: 'test-listing-pilot',
    name: 'repo-A',
    fullName: 'test-listing-pilot/repo-A',
    private: false,
    isConnected: false,
  });
  // Pass { timestamps: false } to prevent Mongoose from resetting updatedAt to now
  await Repository.updateOne({ _id: repoA._id }, { updatedAt: new Date(now - 3600 * 1000) }, { timestamps: false }); // 1 hour ago

  const repoB = await Repository.create({
    userId: testUser._id,
    githubRepoId: 90002,
    owner: 'test-listing-pilot',
    name: 'repo-B',
    fullName: 'test-listing-pilot/repo-B',
    private: false,
    isConnected: true, // Connected
  });
  await Repository.updateOne({ _id: repoB._id }, { updatedAt: new Date(now - 3600 * 3000) }, { timestamps: false }); // 3 hours ago

  const repoC = await Repository.create({
    userId: testUser._id,
    githubRepoId: 90003,
    owner: 'test-listing-pilot',
    name: 'repo-C',
    fullName: 'test-listing-pilot/repo-C',
    private: false,
    isConnected: false,
  });
  await Repository.updateOne({ _id: repoC._id }, { updatedAt: new Date(now - 600 * 1000) }, { timestamps: false }); // 10 mins ago

  const repoD = await Repository.create({
    userId: testUser._id,
    githubRepoId: 90004,
    owner: 'test-listing-pilot',
    name: 'repo-D',
    fullName: 'test-listing-pilot/repo-D',
    private: false,
    isConnected: true, // Connected & Newest
  });
  await Repository.updateOne({ _id: repoD._id }, { updatedAt: new Date(now - 300 * 1000) }, { timestamps: false }); // 5 mins ago

  const repoE = await Repository.create({
    userId: testUser._id,
    githubRepoId: 90005,
    owner: 'test-listing-pilot',
    name: 'repo-E',
    fullName: 'test-listing-pilot/repo-E',
    private: false,
    isConnected: false,
  });
  await Repository.updateOne({ _id: repoE._id }, { updatedAt: new Date(now - 3600 * 5000) }, { timestamps: false }); // 5 hours ago

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Request without JWT
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing GET /api/repositories without token...');
    const res1 = await fetch(`http://localhost:${PORT}/api/repositories`);
    console.log('Response Status (Expected 401):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body:', JSON.stringify(body1));
    if (res1.status === 401 && body1.error === 'Unauthorized') {
      console.log('SUCCESS: Blocked request without token.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Request with valid JWT (Response Shape Check)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing GET /api/repositories with valid token...');
    const res2 = await fetch(`http://localhost:${PORT}/api/repositories`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    console.log('Response Status (Expected 200):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Pagination Metadata:', body2.pagination);
    console.log('Repositories Count:', body2.repositories.length);

    if (
      res2.status === 200 &&
      Array.isArray(body2.repositories) &&
      body2.repositories.length === 5 &&
      body2.pagination.total === 5 &&
      body2.pagination.page === 1 &&
      body2.pagination.limit === 20 &&
      body2.pagination.totalPages === 1
    ) {
      console.log('SUCCESS: Correctly returned repositories list and paginated metadata structure.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}, Body: ${JSON.stringify(body2)}`);
    }

    // -------------------------------------------------------------
    // Test 3: Pagination parameter checks (limit = 2)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing pagination limits (GET /api/repositories?page=1&limit=2)...');
    const res3 = await fetch(`http://localhost:${PORT}/api/repositories?page=1&limit=2`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    console.log('Response Status (Expected 200):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Pagination Metadata (Expected limit: 2, totalPages: 3):', body3.pagination);
    console.log('Items returned (Expected 2):', body3.repositories.length);

    if (
      res3.status === 200 &&
      body3.repositories.length === 2 &&
      body3.pagination.limit === 2 &&
      body3.pagination.total === 5 &&
      body3.pagination.totalPages === 3
    ) {
      console.log('SUCCESS: Pagination skip/limit arithmetic works correctly.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Body: ${JSON.stringify(body3)}`);
    }

    // -------------------------------------------------------------
    // Test 4: Sorting verification (Connected repositories first, then newest updated)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing sorting rules connected-first, then newest-updated...');
    // We expect the sorting order to be:
    // 1. Repo D (Connected, 5 mins ago)
    // 2. Repo B (Connected, 3 hours ago)
    // 3. Repo C (Unconnected, 10 mins ago)
    // 4. Repo A (Unconnected, 1 hour ago)
    // 5. Repo E (Unconnected, 5 hours ago)
    const sortedNames = body2.repositories.map((r: any) => r.name);
    console.log('Sorted Repositories in Response:', sortedNames);

    const expectedOrder = ['repo-D', 'repo-B', 'repo-C', 'repo-A', 'repo-E'];
    const matchesExpected = sortedNames.every((val: string, i: number) => val === expectedOrder[i]);

    if (matchesExpected) {
      console.log('SUCCESS: Repositories sorted exactly by connected-first and updatedAt-descending.');
    } else {
      throw new Error(`FAIL: Sorting order incorrect. Got: ${JSON.stringify(sortedNames)}, Expected: ${JSON.stringify(expectedOrder)}`);
    }

    // -------------------------------------------------------------
    // Test 5: Next Page checks
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing page offsets (GET /api/repositories?page=2&limit=2)...');
    const res5 = await fetch(`http://localhost:${PORT}/api/repositories?page=2&limit=2`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    const body5 = await res5.json() as any;
    const page2Names = body5.repositories.map((r: any) => r.name);
    console.log('Page 2 Repositories:', page2Names);
    
    // Page 1: repo-D, repo-B
    // Page 2: repo-C, repo-A (expected)
    if (body5.repositories.length === 2 && page2Names[0] === 'repo-C' && page2Names[1] === 'repo-A') {
      console.log('SUCCESS: Page 2 skip offset retrieves correct sequence.');
    } else {
      throw new Error(`FAIL: Offset paging fetched wrong repos: ${JSON.stringify(page2Names)}`);
    }

  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    // Cleanup records
    console.log('\nCleaning up verification database test records...');
    await Repository.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
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
