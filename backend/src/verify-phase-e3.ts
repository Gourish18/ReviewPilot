import { app } from './app.js';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { generateToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- Phase E.3 Repository Controller & Routes Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test users and repositories...');
  await User.deleteMany({ githubId: 888888 });
  await Repository.deleteMany({ githubRepoId: { $in: [90001, 90002] } });

  // Create a mock User with a dummy GitHub access token
  console.log('Creating test user...');
  const testUser = await User.create({
    githubId: 888888,
    username: 'test-sync-pilot',
    email: 'sync@reviewpilot.com',
    accessToken: 'gho_mockGithubTokenVal123',
  });
  const userIdStr = testUser._id.toString();
  const validToken = generateToken(userIdStr);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------
    // Test 1: Sync without JWT token
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing POST /api/repositories/sync without token...');
    const res1 = await originalFetch(`http://localhost:${PORT}/api/repositories/sync`, { method: 'POST' });
    console.log('Response Status (Expected 401):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body:', JSON.stringify(body1));
    if (res1.status === 401 && body1.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected request without token.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Sync with invalid JWT token
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing POST /api/repositories/sync with invalid token...');
    const res2 = await originalFetch(`http://localhost:${PORT}/api/repositories/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${validToken}_tampered` }
    });
    console.log('Response Status (Expected 401):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));
    if (res2.status === 401 && body2.error === 'Unauthorized') {
      console.log('SUCCESS: Rejected request with invalid token.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Sync with valid JWT token (Mocking GitHub API fetch)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing POST /api/repositories/sync with valid token (Stabbing GitHub API)...');
    
    const mockGithubRepos = [
      {
        id: 90001,
        name: 'sync-repo-one',
        full_name: 'test-sync-pilot/sync-repo-one',
        owner: { login: 'test-sync-pilot', avatar_url: 'http://avatar.png' },
        private: true,
        description: 'First synced repo',
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
      },
      {
        id: 90002,
        name: 'sync-repo-two',
        full_name: 'test-sync-pilot/sync-repo-two',
        owner: { login: 'test-sync-pilot', avatar_url: 'http://avatar.png' },
        private: false,
        description: 'Second synced repo',
        language: 'JavaScript',
        updated_at: new Date().toISOString(),
      }
    ];

    // Stub global fetch to return mock repositories when the controller requests it
    globalThis.fetch = async (input, init) => {
      return new Response(JSON.stringify(mockGithubRepos), {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' })
      });
    };

    const res3 = await originalFetch(`http://localhost:${PORT}/api/repositories/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${validToken}` }
    });

    console.log('Response Status (Expected 200):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));

    if (
      res3.status === 200 &&
      body3.success === true &&
      body3.repositoryCount === 2 &&
      body3.upsertedCount === 2
    ) {
      console.log('SUCCESS: Route returned 200 and synchronization stats as expected.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Status: ${res3.status}, Body: ${JSON.stringify(body3)}`);
    }

    // -------------------------------------------------------------
    // Test 4: MongoDB Verification
    // -------------------------------------------------------------
    console.log('\n[Test 4] Verifying repositories created in MongoDB...');
    const reposInDb = await Repository.find({ userId: testUser._id }).sort({ githubRepoId: 1 });
    console.log(`Repositories found in DB: ${reposInDb.length}`);
    reposInDb.forEach(r => console.log(' ->', r.toJSON()));

    if (reposInDb.length === 2 && reposInDb[0].githubRepoId === 90001 && reposInDb[1].githubRepoId === 90002) {
      console.log('SUCCESS: Repository documents persisted successfully in MongoDB.');
    } else {
      throw new Error('FAIL: Persisted database repository documents mismatch.');
    }

    // -------------------------------------------------------------
    // Test 5: Run sync twice (Idempotency check)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Simulating second synchronization (Idempotency check)...');
    const res5 = await originalFetch(`http://localhost:${PORT}/api/repositories/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${validToken}` }
    });

    console.log('Response Status (Expected 200):', res5.status);
    const body5 = await res5.json() as any;
    console.log('Response Body (Expected upsertedCount: 0):', JSON.stringify(body5));

    if (res5.status === 200 && body5.success === true && body5.upsertedCount === 0) {
      console.log('SUCCESS: Second synchronization executed with 0 upserts, proving idempotency.');
    } else {
      throw new Error(`FAIL: Second sync is not idempotent. Body: ${JSON.stringify(body5)}`);
    }

  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    // Restore fetch
    globalThis.fetch = originalFetch;

    // Cleanup test records
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
