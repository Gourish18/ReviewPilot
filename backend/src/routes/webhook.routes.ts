import express, { Router } from 'express';
import { handleGithubWebhook } from '../controllers/webhook.controller.js';
import { verifyGithubWebhook } from '../middleware/verifyGithubWebhook.js';

const router = Router();

// Route to receive GitHub webhooks, guarded by signature verification middleware
router.post(
  '/github',
  express.raw({ type: 'application/json' }),
  verifyGithubWebhook,
  handleGithubWebhook
);

export default router;
