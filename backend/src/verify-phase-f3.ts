import { app } from './app.js';
import http from 'http';
import crypto from 'crypto';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { generateToken } from './services/token.service.js';
import { env } from './config/env.js';

async function runVerification() {
  console.log('--- Phase F.3 Pull Request Data Ingestion Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test users and repositories...');
  await User.deleteMany({ githubId: { $in: [888888, 888889] } });
  await Repository.deleteMany({ githubRepoId: { $in: [99002, 99003, 99004] } });

  // Create a mock User with valid mock token
  console.log('Creating test users...');
  const testUser = await User.create({
    githubId: 888888,
    username: 'test-ingestion-pilot',
    email: 'ingest@reviewpilot.com',
    accessToken: 'mock_access_token_123',
  });

  // Create a mock User with rate limit token
  const rateLimitUser = await User.create({
    githubId: 888889,
    username: 'test-ratelimit-pilot',
    email: 'ratelimit@reviewpilot.com',
    accessToken: 'mock_rate_limit_token',
  });

  // Seed repositories
  console.log('Seeding repositories...');
  const repoConnected = await Repository.create({
    userId: testUser._id,
    githubRepoId: 99002,
    owner: 'test-ingestion-pilot',
    name: 'repo-connected',
    fullName: 'test-ingestion-pilot/repo-connected',
    private: false,
    isConnected: true,
  });

  const repoDisconnected = await Repository.create({
    userId: testUser._id,
    githubRepoId: 99003,
    owner: 'test-ingestion-pilot',
    name: 'repo-disconnected',
    fullName: 'test-ingestion-pilot/repo-disconnected',
    private: false,
    isConnected: false,
  });

  const repoRateLimited = await Repository.create({
    userId: rateLimitUser._id,
    githubRepoId: 99004,
    owner: 'test-ratelimit-pilot',
    name: 'repo-ratelimit',
    fullName: 'test-ratelimit-pilot/repo-ratelimit',
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
    // Test 1: Pull Request Action: opened (Connected repository)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing PR Opened on connected repository (99002)...');
    const payload1 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 99002,
        name: 'repo-connected',
        full_name: 'test-ingestion-pilot/repo-connected',
        owner: {
          login: 'test-ingestion-pilot'
        }
      },
      pull_request: {
        number: 42,
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
    console.log('Response Body:', JSON.stringify(body1));

    if (res1.status === 200 && body1.success === true && body1.filesCount === 2) {
      console.log('SUCCESS: Pull Request opened ingestion triggered files/diff lookup successfully.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Pull Request Action: synchronize (Connected repository)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing PR Synchronize on connected repository (99002)...');
    const payload2 = JSON.stringify({
      action: 'synchronize',
      repository: {
        id: 99002,
        name: 'repo-connected',
        full_name: 'test-ingestion-pilot/repo-connected',
        owner: {
          login: 'test-ingestion-pilot'
        }
      },
      pull_request: {
        number: 42,
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

    console.log('Response Status (Expected 200):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));

    if (res2.status === 200 && body2.success === true && body2.filesCount === 2) {
      console.log('SUCCESS: Pull Request synchronize event processed successfully.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Pull Request Action: closed (Should be ignored)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing unsupported PR Action (closed) on connected repository (99002)...');
    const payload3 = JSON.stringify({
      action: 'closed',
      repository: {
        id: 99002,
        name: 'repo-connected',
        full_name: 'test-ingestion-pilot/repo-connected',
        owner: {
          login: 'test-ingestion-pilot'
        }
      },
      pull_request: {
        number: 42,
      }
    });
    const sig3 = generateSignature(payload3, env.githubWebhookSecret);

    const res3 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig3,
      },
      body: payload3,
    });

    console.log('Response Status (Expected 200):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));

    if (res3.status === 200 && body3.ignored === true && body3.reason.includes('unsupported')) {
      console.log('SUCCESS: Closed action ignored correctly.');
    } else {
      throw new Error(`FAIL: Test 3 failed. Status: ${res3.status}`);
    }

    // -------------------------------------------------------------
    // Test 4: Pull Request Opened on Disconnected Repository
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing PR Opened on disconnected repository (99003)...');
    const payload4 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 99003,
        name: 'repo-disconnected',
        full_name: 'test-ingestion-pilot/repo-disconnected',
        owner: {
          login: 'test-ingestion-pilot'
        }
      },
      pull_request: {
        number: 100,
      }
    });
    const sig4 = generateSignature(payload4, env.githubWebhookSecret);

    const res4 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig4,
      },
      body: payload4,
    });

    console.log('Response Status (Expected 200):', res4.status);
    const body4 = await res4.json() as any;
    console.log('Response Body:', JSON.stringify(body4));

    if (res4.status === 200 && body4.ignored === true && body4.reason.includes('not connected')) {
      console.log('SUCCESS: Disconnected repository PR event ignored correctly.');
    } else {
      throw new Error(`FAIL: Test 4 failed. Status: ${res4.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Rate Limiting Error Handling
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing GitHub rate limit exception flow...');
    const payload5 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 99004,
        name: 'repo-ratelimit',
        full_name: 'test-ratelimit-pilot/repo-ratelimit',
        owner: {
          login: 'test-ratelimit-pilot'
        }
      },
      pull_request: {
        number: 5,
      }
    });
    const sig5 = generateSignature(payload5, env.githubWebhookSecret);

    const res5 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': sig5,
      },
      body: payload5,
    });

    console.log('Response Status (Expected 500):', res5.status);
    const body5 = await res5.json() as any;
    console.log('Response Body:', JSON.stringify(body5));

    if (res5.status === 500 && body5.error.includes('Internal server error')) {
      console.log('SUCCESS: Rate limit handled gracefully without crashing Express server.');
    } else {
      throw new Error(`FAIL: Test 5 failed. Status: ${res5.status}`);
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Repository.deleteMany({ githubRepoId: { $in: [99002, 99003, 99004] } });
    await User.deleteMany({ githubId: { $in: [888888, 888889] } });
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
