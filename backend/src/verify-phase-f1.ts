import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { handleGithubWebhook } from './controllers/webhook.controller.js';
import { verifyGithubSignature } from './services/webhook.service.js';
import { env } from './config/env.js';

async function runVerification() {
  console.log('--- Phase F.1 Webhook Foundation Verification ---');

  const PORT = 8999;
  const app = express();

  // Middleware to preserve raw body as a Buffer for signature verification
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Route registration (for verification purposes)
  app.post('/api/webhooks/github', handleGithubWebhook);

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
    // -------------------------------------------------------------
    // Test 1: Signature Verification Unit Tests
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing verifyGithubSignature directly...');
    const payload = JSON.stringify({ zen: 'Keep it simple, stupid.' });
    const correctSig = generateSignature(payload, env.githubWebhookSecret);
    const wrongSig = generateSignature(payload, 'wrong_secret');

    const resultValid = verifyGithubSignature(payload, correctSig);
    const resultInvalid = verifyGithubSignature(payload, wrongSig);

    console.log('Valid signature verification result:', resultValid);
    console.log('Invalid signature verification result:', resultInvalid);

    if (resultValid === true && resultInvalid === false) {
      console.log('SUCCESS: verifyGithubSignature passed unit check.');
    } else {
      throw new Error('FAIL: verifyGithubSignature unit checks failed.');
    }

    // -------------------------------------------------------------
    // Test 2: Ping Webhook Event Call
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing HTTP POST /api/webhooks/github (ping)...');
    const pingPayload = JSON.stringify({ zen: 'Design for failure.' });
    const pingSig = generateSignature(pingPayload, env.githubWebhookSecret);

    const resPing = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': pingSig,
      },
      body: pingPayload,
    });

    console.log('Response Status (Expected 200):', resPing.status);
    const bodyPing = await resPing.json() as any;
    console.log('Response Body:', JSON.stringify(bodyPing));

    if (resPing.status === 200 && bodyPing.success === true && bodyPing.event === 'ping') {
      console.log('SUCCESS: Ping event processed successfully.');
    } else {
      throw new Error(`FAIL: Ping event processing failed. Status: ${resPing.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Pull Request Webhook Event Call (action: opened)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing HTTP POST /api/webhooks/github (pull_request opened)...');
    const prPayload = JSON.stringify({
      action: 'opened',
      pull_request: {
        number: 42,
        title: 'feat: add agent intelligence',
      }
    });
    const prSig = generateSignature(prPayload, env.githubWebhookSecret);

    const resPr = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': prSig,
      },
      body: prPayload,
    });

    console.log('Response Status (Expected 200):', resPr.status);
    const bodyPr = await resPr.json() as any;
    console.log('Response Body:', JSON.stringify(bodyPr));

    if (resPr.status === 200 && bodyPr.success === true && bodyPr.event === 'pull_request' && bodyPr.action === 'opened') {
      console.log('SUCCESS: Pull request opened event processed successfully.');
    } else {
      throw new Error(`FAIL: Pull request event processing failed. Status: ${resPr.status}`);
    }

    // -------------------------------------------------------------
    // Test 4: Webhook Event with Invalid Signature
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing HTTP POST /api/webhooks/github with tampered signature...');
    const fakeSig = generateSignature(pingPayload, 'tamperedSecret123');

    const resFake = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': fakeSig,
      },
      body: pingPayload,
    });

    console.log('Response Status (Expected 401):', resFake.status);
    const bodyFake = await resFake.json() as any;
    console.log('Response Body:', JSON.stringify(bodyFake));

    if (resFake.status === 401 && bodyFake.error === 'Invalid webhook signature') {
      console.log('SUCCESS: Tampered signatures are blocked.');
    } else {
      throw new Error(`FAIL: Block of tampered signature failed. Status: ${resFake.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Webhook Event with Missing Headers
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing HTTP POST /api/webhooks/github with missing event header...');
    const resNoHeaders = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': pingSig,
      },
      body: pingPayload,
    });

    console.log('Response Status (Expected 400):', resNoHeaders.status);
    const bodyNoHeaders = await resNoHeaders.json() as any;
    console.log('Response Body:', JSON.stringify(bodyNoHeaders));

    if (resNoHeaders.status === 400 && bodyNoHeaders.error === 'Missing x-github-event header') {
      console.log('SUCCESS: Missing event header request blocked.');
    } else {
      throw new Error(`FAIL: Missing event header check failed. Status: ${resNoHeaders.status}`);
    }

  } catch (err: any) {
    console.error('Verification encountered an error:', err.message || err);
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
