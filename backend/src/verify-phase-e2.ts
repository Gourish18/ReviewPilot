import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { syncRepositories } from './services/repositorySync.service.js';
import { IGithubRepository } from './services/githubApi.service.js';

async function runVerification() {
  console.log('--- Phase E.2 Repository Synchronization Service Verification ---');

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  console.log('Database connected.');

  // Create a mock User for test ownership
  console.log('Creating test user...');
  const testUser = await User.create({
    githubId: 888888,
    username: 'test-sync-pilot',
    email: 'sync@reviewpilot.com',
  });
  const userIdStr = testUser._id.toString();

  try {
    // -------------------------------------------------------------
    // Test 1: Sync empty array
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing syncRepositories with an empty array...');
    const result1 = await syncRepositories(userIdStr, []);
    console.log('Result of empty sync:', result1);
    if (result1 && result1.ok === 1 && result1.insertedCount === 0) {
      console.log('SUCCESS: Empty sync resolved cleanly with no operations.');
    } else {
      throw new Error(`FAIL: Test 1 resolved with unexpected result: ${JSON.stringify(result1)}`);
    }

    // -------------------------------------------------------------
    // Test 2: Sync new repositories
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing syncRepositories with new repositories...');
    const githubRepos: IGithubRepository[] = [
      {
        id: 10001,
        name: 'repo-one',
        full_name: 'test-sync-pilot/repo-one',
        owner: { login: 'test-sync-pilot', avatar_url: 'http://avatar.png' },
        private: true,
        description: 'First test repository',
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
      },
      {
        id: 10002,
        name: 'repo-two',
        full_name: 'test-sync-pilot/repo-two',
        owner: { login: 'test-sync-pilot', avatar_url: 'http://avatar.png' },
        private: false,
        description: 'Second test repository',
        language: 'JavaScript',
        updated_at: new Date().toISOString(),
      }
    ];

    const result2 = await syncRepositories(userIdStr, githubRepos);
    console.log('Result of first sync:', {
      ok: result2.ok,
      upsertedCount: result2.upsertedCount,
      insertedCount: result2.insertedCount,
      matchedCount: result2.matchedCount,
      modifiedCount: result2.modifiedCount
    });

    const reposInDb = await Repository.find({ userId: testUser._id });
    console.log(`Repositories in DB (Expected 2): ${reposInDb.length}`);
    reposInDb.forEach(r => console.log(' ->', r.toJSON()));

    if (reposInDb.length === 2 && result2.upsertedCount === 2) {
      console.log('SUCCESS: Both repositories successfully created in database.');
    } else {
      throw new Error(`FAIL: Failed to create expected repositories. DB Count: ${reposInDb.length}`);
    }

    // -------------------------------------------------------------
    // Test 3: Sync existing repositories (Updates, no duplicates)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing syncRepositories updates metadata without duplicate records...');
    const updatedGithubRepos: IGithubRepository[] = [
      {
        id: 10001,
        name: 'repo-one-renamed',
        full_name: 'test-sync-pilot/repo-one-renamed',
        owner: { login: 'test-sync-pilot', avatar_url: 'http://avatar.png' },
        private: true,
        description: 'Updated first repository description',
        language: 'TypeScript',
        updated_at: new Date().toISOString(),
      },
      {
        id: 10002,
        name: 'repo-two',
        full_name: 'test-sync-pilot/repo-two',
        owner: { login: 'test-sync-pilot', avatar_url: 'http://avatar.png' },
        private: false,
        description: 'Second test repository',
        language: 'Python', // Changed language from JS to Python
        updated_at: new Date().toISOString(),
      }
    ];

    const result3 = await syncRepositories(userIdStr, updatedGithubRepos);
    console.log('Result of update sync:', {
      ok: result3.ok,
      upsertedCount: result3.upsertedCount,
      insertedCount: result3.insertedCount,
      matchedCount: result3.matchedCount,
      modifiedCount: result3.modifiedCount
    });

    const reposInDb3 = await Repository.find({ userId: testUser._id }).sort({ githubRepoId: 1 });
    console.log(`Repositories in DB (Expected 2): ${reposInDb3.length}`);
    reposInDb3.forEach(r => console.log(' ->', r.toJSON()));

    if (
      reposInDb3.length === 2 &&
      reposInDb3[0].name === 'repo-one-renamed' &&
      reposInDb3[0].description === 'Updated first repository description' &&
      reposInDb3[1].language === 'Python'
    ) {
      console.log('SUCCESS: Repository metadata correctly updated. No duplicate documents created.');
    } else {
      throw new Error('FAIL: Repository updating failed or created duplicate documents.');
    }

    // -------------------------------------------------------------
    // Test 4: Preserve existing connection state
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing manual connection state (isConnected) preservation...');
    
    // Manually mark repo-one-renamed as connected
    console.log("Setting 'repo-one-renamed' isConnected to true...");
    await Repository.updateOne({ userId: testUser._id, githubRepoId: 10001 }, { isConnected: true });

    const beforeSync = await Repository.findOne({ userId: testUser._id, githubRepoId: 10001 });
    console.log('State BEFORE Sync:', { name: beforeSync?.name, isConnected: beforeSync?.isConnected });

    // Run sync again
    console.log('Running sync operation...');
    const result4 = await syncRepositories(userIdStr, updatedGithubRepos);
    console.log('Result of state preservation sync:', {
      ok: result4.ok,
      modifiedCount: result4.modifiedCount
    });

    const afterSync = await Repository.findOne({ userId: testUser._id, githubRepoId: 10001 });
    console.log('State AFTER Sync:', { name: afterSync?.name, isConnected: afterSync?.isConnected });

    if (afterSync && afterSync.isConnected === true) {
      console.log('SUCCESS: isConnected state was successfully preserved.');
    } else {
      throw new Error(`FAIL: isConnected state was overwritten or reset! Current: ${afterSync?.isConnected}`);
    }

    // -------------------------------------------------------------
    // Test 5: Idempotency (Double Run check)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing sync idempotency (running twice with no changes)...');
    
    // First run (no changes)
    const result5a = await syncRepositories(userIdStr, updatedGithubRepos);
    console.log('First Run Result (Expected upsertedCount: 0):', {
      matchedCount: result5a.matchedCount,
      upsertedCount: result5a.upsertedCount
    });

    // Second run (no changes)
    const result5b = await syncRepositories(userIdStr, updatedGithubRepos);
    console.log('Second Run Result (Expected upsertedCount: 0):', {
      matchedCount: result5b.matchedCount,
      upsertedCount: result5b.upsertedCount
    });

    if (result5a.upsertedCount === 0 && result5b.upsertedCount === 0 && reposInDb3.length === 2) {
      console.log('SUCCESS: Synchronization is fully idempotent. Repeating updates does not create duplicate database records.');
    } else {
      throw new Error(`FAIL: Sync is not idempotent. upsertedCount: ${result5a.upsertedCount} / ${result5b.upsertedCount}`);
    }

  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    // Cleanup database test data
    console.log('\nCleaning up verification database test records...');
    await Repository.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('Cleanup finished.');

    console.log('Disconnecting from database...');
    await disconnectDatabase();
    console.log('Verification Script Finished.');
  }
}

void runVerification();
