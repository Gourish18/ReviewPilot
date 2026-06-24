import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { Review } from './models/Review.js';

async function runVerification() {
  console.log('--- Phase H.1 Persistence Layer (Review Model) Verification ---');

  try {
    console.log('Connecting to database...');
    await connectDatabase();
    await User.init();
    await Repository.init();
    await Review.init();
    console.log('Database connected.');

    console.log('Cleaning up previous test records...');
    await User.deleteMany({ githubId: { $in: [666666] } });
    await Repository.deleteMany({ githubRepoId: { $in: [77001] } });
    await Review.deleteMany({ prNumber: 4242 });

    // 1. Create Mock User
    console.log('Creating test user...');
    const user = await User.create({
      githubId: 666666,
      username: 'test-persistence-pilot',
      email: 'persist@reviewpilot.com',
      accessToken: 'mock_access_token_123',
    });

    // 2. Create Mock Repository
    console.log('Creating test repository...');
    const repo = await Repository.create({
      userId: user._id,
      githubRepoId: 77001,
      owner: 'test-persistence-pilot',
      name: 'repo-persist-lg',
      fullName: 'test-persistence-pilot/repo-persist-lg',
      private: false,
      isConnected: true,
    });

    // 3. Create Pending Review
    console.log('\n[Test 1] Creating a pending Review document...');
    const review = await Review.create({
      userId: user._id,
      repositoryId: repo._id,
      prNumber: 4242,
      prTitle: 'feat: add database persistence adapter',
      commitSha: 'a1b2c3d4e5f6',
      status: 'pending',
    });

    console.log('Review Document Created Successfully:', review.toJSON());

    // Assert defaults
    if (
      review.status === 'pending' &&
      Array.isArray(review.securityFindings) &&
      review.securityFindings.length === 0 &&
      Array.isArray(review.logicFindings) &&
      review.logicFindings.length === 0 &&
      review.markdownReport === ''
    ) {
      console.log('SUCCESS: Default values for findings and report populated correctly.');
    } else {
      throw new Error('FAIL: Default values were not populated correctly.');
    }

    // 4. Update Review to Completed
    console.log('\n[Test 2] Updating Review document to completed state with findings...');
    const updatedReview = await Review.findByIdAndUpdate(
      review._id,
      {
        status: 'completed',
        triageCategory: 'backend',
        securityFindings: ['Vulnerability 1: Hardcoded API key in config.'],
        logicFindings: ['Improvement 1: Use absolute path imports.'],
        markdownReport: '# Automated Review Summary\n\n- Fix hardcoded key.\n- Use absolute path imports.',
      },
      { returnDocument: 'after' }
    );

    if (!updatedReview) {
      throw new Error('FAIL: Review document not found for update.');
    }

    console.log('Review Document Updated Successfully:', updatedReview.toJSON());

    if (
      updatedReview.status === 'completed' &&
      updatedReview.triageCategory === 'backend' &&
      updatedReview.securityFindings.length === 1 &&
      updatedReview.logicFindings.length === 1 &&
      updatedReview.markdownReport.includes('# Automated Review Summary')
    ) {
      console.log('SUCCESS: Review document status and AI findings updated correctly.');
    } else {
      throw new Error('FAIL: Review document properties were not updated correctly.');
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Review.deleteMany({ prNumber: 4242 });
    await Repository.deleteMany({ githubRepoId: { $in: [77001] } });
    await User.deleteMany({ githubId: { $in: [666666] } });
    console.log('Cleanup finished.');

    console.log('Disconnecting from database...');
    await disconnectDatabase();
    console.log('Database disconnected.');
  }
}

void runVerification();
