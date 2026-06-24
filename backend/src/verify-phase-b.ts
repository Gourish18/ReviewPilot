import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';

async function runVerification() {
  console.log('--- Phase B Database Layer Verification ---');

  try {
    // 1. Verify MongoDB Connection
    console.log('\n[1] Connecting to MongoDB...');
    await connectDatabase();
    console.log('MongoDB Connection Successful!');

    // Wait for Mongoose to finish compiling and building indexes
    console.log('Initializing model indexes...');
    await User.init();
    await Repository.init();
    console.log('Indexes initialized.');

    // Clean up previous test runs if any
    console.log('Cleaning up previous test data...');
    await User.deleteMany({ githubId: { $in: [999999, 999998] } });
    await Repository.deleteMany({ githubRepoId: 888888 });

    // 2. Create User document
    console.log('\n[2] Testing User Document Creation...');
    const testUser = await User.create({
      githubId: 999999,
      username: 'test-user-pilot',
      email: 'test@reviewpilot.com',
      avatarUrl: 'https://github.com/images/error.png',
      accessToken: 'gho_someAccessToken12345'
    });
    console.log('User Document Created Successfully:', testUser.toJSON());

    // 3. Verify Unique githubId Constraint
    console.log('\n[3] Testing Unique githubId Constraint...');
    try {
      await User.create({
        githubId: 999999,
        username: 'test-duplicate-user',
        email: 'duplicate@reviewpilot.com',
      });
      console.error('FAIL: Created duplicate user with same githubId! Unique index failed.');
      process.exitCode = 1;
    } catch (err: any) {
      if (err.code === 11000) {
        console.log('SUCCESS: Unique githubId constraint caught duplicate insert. Error code 11000 (duplicate key) as expected.');
      } else {
        console.error('FAIL: Unexpected error during duplicate user creation:', err);
        process.exitCode = 1;
      }
    }

    // 4. Create Repository document referencing User
    console.log('\n[4] Testing Repository Document Creation with User Reference...');
    const testRepo = await Repository.create({
      userId: testUser._id as mongoose.Types.ObjectId,
      githubRepoId: 888888,
      owner: 'test-user-pilot',
      name: 'test-repo',
      fullName: 'test-user-pilot/test-repo',
      description: 'A test repository for verifying Phase B',
      language: 'TypeScript',
      private: true,
      isConnected: false
    });
    console.log('Repository Document Created Successfully:', testRepo.toJSON());

    // 5. Verify Compound Unique Index (userId + githubRepoId)
    console.log('\n[5] Testing Compound Unique Index (userId + githubRepoId)...');
    try {
      await Repository.create({
        userId: testUser._id as mongoose.Types.ObjectId,
        githubRepoId: 888888,
        owner: 'test-user-pilot',
        name: 'test-repo-duplicate',
        fullName: 'test-user-pilot/test-repo-duplicate',
        private: true,
        isConnected: false
      });
      console.error('FAIL: Created duplicate repository for same user + githubRepoId! Compound index failed.');
      process.exitCode = 1;
    } catch (err: any) {
      if (err.code === 11000) {
        console.log('SUCCESS: Compound unique index caught duplicate insert. Error code 11000 (duplicate key) as expected.');
      } else {
        console.error('FAIL: Unexpected error during duplicate repo creation:', err);
        process.exitCode = 1;
      }
    }

    // 6. Test compilation and different user repository index works
    console.log('\n[6] Testing different user same githubRepoId works...');
    const anotherUser = await User.create({
      githubId: 999998,
      username: 'another-user',
      email: 'another@reviewpilot.com',
    });
    const testRepo2 = await Repository.create({
      userId: anotherUser._id as mongoose.Types.ObjectId,
      githubRepoId: 888888, // same repo ID but different user
      owner: 'test-user-pilot',
      name: 'test-repo',
      fullName: 'test-user-pilot/test-repo',
      private: true,
      isConnected: false
    });
    console.log('SUCCESS: Different user can successfully track the same repo ID. Document created:', testRepo2.toJSON());

    // Clean up
    console.log('\nCleaning up verification data...');
    await User.deleteMany({ githubId: { $in: [999999, 999998] } });
    await Repository.deleteMany({ githubRepoId: 888888 });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Verification failed with error:', error);
    process.exitCode = 1;
  } finally {
    console.log('\nDisconnecting from MongoDB...');
    await disconnectDatabase();
    console.log('Database Disconnected. Verification Script Finished.');
  }
}

void runVerification();
