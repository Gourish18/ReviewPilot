import express, { Router } from 'express';
import { handleGithubWebhook } from '../controllers/webhook.controller.js';
import { verifyGithubWebhook } from '../middleware/verifyGithubWebhook.js';

const router = Router();

// Route to receive GitHub webhooks, guarded by signature verification middleware
// Raw body is parsed upstream in app.ts by express.raw({ type: 'application/json' })
router.post(
  '/github',
  verifyGithubWebhook,
  handleGithubWebhook
);

export default router;
