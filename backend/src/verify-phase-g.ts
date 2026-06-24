import { app } from './app.js';
import http from 'http';
import crypto from 'crypto';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { env } from './config/env.js';

async function runVerification() {
  console.log('--- Phase G LangGraph ReviewState & Workflow Integration Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

  console.log('Connecting to database...');
  await connectDatabase();
  await User.init();
  await Repository.init();
  console.log('Database connected.');

  console.log('Cleaning up previous test users and repositories...');
  await User.deleteMany({ githubId: { $in: [777777] } });
  await Repository.deleteMany({ githubRepoId: { $in: [88001, 88002] } });

  // Create a mock User with valid mock token
  console.log('Creating test user...');
  const testUser = await User.create({
    githubId: 777777,
    username: 'test-langgraph-pilot',
    email: 'langgraph@reviewpilot.com',
    accessToken: 'mock_access_token_123',
  });

  // Seed repositories
  console.log('Seeding repositories...');
  const repoConnected = await Repository.create({
    userId: testUser._id,
    githubRepoId: 88001,
    owner: 'test-langgraph-pilot',
    name: 'repo-connected-lg',
    fullName: 'test-langgraph-pilot/repo-connected-lg',
    private: false,
    isConnected: true,
  });

  const repoDisconnected = await Repository.create({
    userId: testUser._id,
    githubRepoId: 88002,
    owner: 'test-langgraph-pilot',
    name: 'repo-disconnected-lg',
    fullName: 'test-langgraph-pilot/repo-disconnected-lg',
    private: false,
    isConnected: false,
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
    console.log('\n[Test 1] Testing PR Opened on connected repository (88001)...');
    const payload1 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 88001,
        name: 'repo-connected-lg',
        full_name: 'test-langgraph-pilot/repo-connected-lg',
        owner: {
          login: 'test-langgraph-pilot'
        }
      },
      pull_request: {
        number: 42,
        title: 'feat: implement database adapter patterns',
        body: 'This pull request introduces a new MongoDB adapter module for our repository layer.',
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
    console.log('Triage Category:', body1.triageCategory);
    console.log('Security Findings Count:', body1.securityFindings?.length);
    console.log('Logic Findings Count:', body1.logicFindings?.length);
    console.log('Has Markdown Review:', !!body1.finalReviewMarkdown);

    if (
      res1.status === 200 &&
      body1.success === true &&
      body1.triageCategory === 'backend' &&
      Array.isArray(body1.securityFindings) &&
      Array.isArray(body1.logicFindings) &&
      typeof body1.finalReviewMarkdown === 'string' &&
      body1.finalReviewMarkdown.includes('🛡️ Security Vulnerabilities')
    ) {
      console.log('SUCCESS: Pull Request review workflow executed and returned structured findings successfully.');
    } else {
      throw new Error(`FAIL: Test 1 failed. Status: ${res1.status}, Body: ${JSON.stringify(body1)}`);
    }

    // -------------------------------------------------------------
    // Test 2: Pull Request Action: closed on disconnected repository (88002)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing PR Opened on disconnected repository (88002)...');
    const payload2 = JSON.stringify({
      action: 'opened',
      repository: {
        id: 88002,
        name: 'repo-disconnected-lg',
        full_name: 'test-langgraph-pilot/repo-disconnected-lg',
        owner: {
          login: 'test-langgraph-pilot'
        }
      },
      pull_request: {
        number: 43,
        title: 'chore: update documentation',
        body: 'Update readme file with installation instructions.',
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

    if (res2.status === 200 && body2.ignored === true && body2.reason.includes('not connected')) {
      console.log('SUCCESS: Disconnected repository event ignored correctly without executing workflow.');
    } else {
      throw new Error(`FAIL: Test 2 failed. Status: ${res2.status}`);
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up verification database test records...');
    await Repository.deleteMany({ githubRepoId: { $in: [88001, 88002] } });
    await User.deleteMany({ githubId: { $in: [777777] } });
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
