import { Request, Response, NextFunction } from 'express';
import { verifyGithubSignature } from '../services/webhook.service.js';

/**
 * Express middleware to verify GitHub webhook signatures.
 * 
 * This middleware:
 * 1. Checks for the presence of the `x-hub-signature-256` header.
 * 2. Accesses the raw body buffer (parsed by `express.raw` middleware).
 * 3. Compares the signatures timing-safely.
 * 4. Parses the raw buffer into a JSON object so downstream controller actions 
 *    can interact with the parsed properties on `req.body`.
 */
export const verifyGithubWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const signature = req.headers['x-hub-signature-256'] as string;

  // 1. Validate signature header presence
  if (!signature) {
    console.warn('Webhook request rejected: Missing x-hub-signature-256 header');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  const rawBody = req.body; // Expects express.raw() to store raw payload as a Buffer here

  // 2. Validate raw body is a Buffer
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    console.error('Webhook payload is not a raw Buffer. Ensure raw body parser is configured.');
    res.status(400).json({ error: 'Raw body parsing failed' });
    return;
  }

  // 3. Verify signature cryptographically
  const isValid = verifyGithubSignature(rawBody, signature);
  if (!isValid) {
    console.warn('Webhook request rejected: Signature verification failed');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  next();
};
