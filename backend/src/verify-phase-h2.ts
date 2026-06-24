import { app } from './app.js';
import http from 'http';
import crypto from 'crypto';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { Review } from './models/Review.js';
import { compiledReviewWorkflow } from './services/review/nodes/workflow.js';
import { env } from './config/env.js';

async function runVerification() {
  console.log('--- Phase H.2 Review Persistence Integration Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  await Review.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test records...');
  await User.deleteMany({ githubId: { $in: [555555] } });
  await Repository.deleteMany({ githubRepoId: { $in: [66001, 66002] } });
  await Review.deleteMany({ prNumber: { $in: [5001, 5002] } });

  // Create a mock User
  console.log('Creating test user...');
  const testUser = await User.create({
    githubId: 555555,
    username: 'test-persist-integration-pilot',
    email: 'persist-integration@reviewpilot.com',
    accessToken: 'mock_access_token_123',
  });

  // Seed repositories
  console.log('Seeding repositories...');
  const repoConnected = await Repository.create({
    userId: testUser._id,
    githubRepoId: 66001,
    owner: 'test-persist-integration-pilot',
    name: 'repo-connected-persist',
    fullName: 'test-persist-integration-pilot/repo-connected-persist',
    private: false,
    isConnected: true,
  });

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  const generateSignature = (payload: string, secret: string): string => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return 'sha256=' + hmac.digest('hex');
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Successful Review Lifecycle (Pending -> Completed)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing Successful PR Review Persistence Lifecycle (Pending -> Completed)...');
    const payload1 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 66001,
        name: 'repo-connected-persist',
        full_name: 'test-persist-integration-pilot/repo-connected-persist',
        owner: {
          login: 'test-persist-integration-pilot'
        }
      },
      pull_request: {
        number: 5001,
        title: 'feat: add persistence integrations',
        body: 'Implement database persistence on webhooks.',
      }
    });
    const sig1 = generateSignature(payload1, env.githubWebhookSecret);

    const res1 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig1,
      },
      body: payload1,
    });

    console.log('Response Status (Expected 200):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body Keys:', Object.keys(body1));

    // Verify Review Record exists in database as completed
    const reviewRecord1 = await Review.findOne({
      repositoryId: repoConnected._id,
      prNumber: 5001
    });

    if (!reviewRecord1) {
      throw new Error('FAIL: Review record was not created in the database.');
    }

    console.log('Database Review Record Found:', reviewRecord1.toJSON());

    if (
      reviewRecord1.status === 'completed' &&
      reviewRecord1.triageCategory === 'backend' &&
      reviewRecord1.securityFindings.length === 2 &&
      reviewRecord1.logicFindings.length === 2 &&
      reviewRecord1.markdownReport.includes('🛡️ Security Vulnerabilities')
    ) {
      console.log('SUCCESS: Review Record transitioned from pending to completed and persisted AI findings successfully.');
    } else {
      throw new Error(`FAIL: Review Record state or findings mismatched. Status: ${reviewRecord1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Failed Review Lifecycle (Pending -> Failed)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing Failed PR Review Persistence Lifecycle (Pending -> Failed)...');
    
    // Temporarily mock compiledReviewWorkflow.invoke to throw an error
    const originalInvoke = compiledReviewWorkflow.invoke;
    compiledReviewWorkflow.invoke = async () => {
      throw new Error('Simulated LangGraph workflow execution exception');
    };

    const payload2 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 66001,
        name: 'repo-connected-persist',
        full_name: 'test-persist-integration-pilot/repo-connected-persist',
        owner: {
          login: 'test-persist-integration-pilot'
        }
      },
      pull_request: {
        number: 5002,
        title: 'feat: trigger simulated failure',
        body: 'Simulate workflow crash.',
      }
    });
    const sig2 = generateSignature(payload2, env.githubWebhookSecret);

    const res2 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig2,
      },
      body: payload2,
    });

    // Restore original invoke method
    compiledReviewWorkflow.invoke = originalInvoke;

    console.log('Response Status (Expected 500):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));

    // Verify Review Record exists in database as failed
    const reviewRecord2 = await Review.findOne({
      repositoryId: repoConnected._id,
      prNumber: 5002
    });

    if (!reviewRecord2) {
      throw new Error('FAIL: Review record for failed run was not created.');
    }

    console.log('Database Review Record Found for Failed Run:', reviewRecord2.toJSON());

    if (reviewRecord2.status === 'failed') {
      console.log('SUCCESS: Review Record transitioned from pending to failed correctly upon workflow exception.');
    } else {
      throw new Error(`FAIL: Review Record state mismatched. Expected "failed", got: ${reviewRecord2.status}`);
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Review.deleteMany({ prNumber: { $in: [5001, 5002] } });
    await Repository.deleteMany({ githubRepoId: { $in: [66001] } });
    await User.deleteMany({ githubId: { $in: [555555] } });
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
