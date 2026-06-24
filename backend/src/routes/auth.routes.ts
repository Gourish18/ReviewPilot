import { Router } from 'express';
import { login, githubCallback, getCurrentUser } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Route to initiate GitHub OAuth redirection
router.get('/login', login);

// Route for GitHub redirect callback query parameter processing
router.get('/github/callback', githubCallback);

// Route to retrieve the currently authenticated user's profile
router.get('/me', requireAuth, getCurrentUser);

export default router;
