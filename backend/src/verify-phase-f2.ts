import { app } from './app.js';
import http from 'http';
import crypto from 'crypto';
import { env } from './config/env.js';

async function runVerification() {
  console.log('--- Phase F.2 Webhook Routing & Middleware Verification ---');

  const PORT = 8999;
  const server = http.createServer(app);

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
    const pingPayload = JSON.stringify({
      zen: 'Non-blocking is better than blocking.',
      repository: {
        name: 'reviewpilot',
        full_name: 'test-user/reviewpilot'
      }
    });

    const prPayload = JSON.stringify({
      action: 'opened',
      repository: {
        name: 'reviewpilot',
        full_name: 'test-user/reviewpilot'
      },
      pull_request: {
        number: 17
      }
    });

    const validPingSig = generateSignature(pingPayload, env.githubWebhookSecret);
    const validPrSig = generateSignature(prPayload, env.githubWebhookSecret);
    const invalidSig = generateSignature(pingPayload, 'tamperedSecretKey');

    // -------------------------------------------------------------
    // Test 1: Missing Signature
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing POST /api/webhooks/github with missing signature...');
    const res1 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'ping'
      },
      body: pingPayload
    });

    console.log('Response Status (Expected 401):', res1.status);
    const body1 = await res1.json() as any;
    console.log('Response Body:', JSON.stringify(body1));
    if (res1.status === 401 && body1.error === 'Invalid webhook signature') {
      console.log('SUCCESS: Missing signature rejected.');
    } else {
      throw new Error(`FAIL: Missing signature test failed. Got: ${res1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Invalid Signature
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing POST /api/webhooks/github with invalid signature...');
    const res2 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': invalidSig
      },
      body: pingPayload
    });

    console.log('Response Status (Expected 401):', res2.status);
    const body2 = await res2.json() as any;
    console.log('Response Body:', JSON.stringify(body2));
    if (res2.status === 401 && body2.error === 'Invalid webhook signature') {
      console.log('SUCCESS: Invalid signature rejected.');
    } else {
      throw new Error(`FAIL: Invalid signature test failed. Got: ${res2.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Valid Signature (Pull Request Event)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing POST /api/webhooks/github with valid signature (pull_request event)...');
    const res3 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': validPrSig
      },
      body: prPayload
    });

    console.log('Response Status (Expected 200):', res3.status);
    const body3 = await res3.json() as any;
    console.log('Response Body:', JSON.stringify(body3));
    if (res3.status === 200 && body3.success === true) {
      console.log('SUCCESS: Valid pull request event processed.');
    } else {
      throw new Error(`FAIL: Valid signature test failed. Got: ${res3.status}`);
    }

    // -------------------------------------------------------------
    // Test 4: Ping Webhook Event
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing POST /api/webhooks/github with valid signature (ping event)...');
    const res4 = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': validPingSig
      },
      body: pingPayload
    });

    console.log('Response Status (Expected 200):', res4.status);
    const body4 = await res4.json() as any;
    console.log('Response Body:', JSON.stringify(body4));
    if (res4.status === 200 && body4.success === true) {
      console.log('SUCCESS: Ping event processed.');
    } else {
      throw new Error(`FAIL: Ping signature test failed. Got: ${res4.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Verify standard JSON APIs are not broken
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing health check to verify standard endpoints are not broken...');
    const resHealth = await fetch(`http://localhost:${PORT}/health`);
    console.log('Response Status (Expected 200):', resHealth.status);
    const bodyHealth = await resHealth.json() as any;
    console.log('Health Body:', JSON.stringify(bodyHealth));
    if (resHealth.status === 200 && bodyHealth.status === 'ok') {
      console.log('SUCCESS: Standard endpoints work fine.');
    } else {
      throw new Error('FAIL: Standard health endpoint failed.');
    }

  } catch (err: any) {
    console.error('Verification failed with error:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nShutting down test server...');
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Test server closed.');
        resolve();
      });
    });
  }
}

void runVerification();
