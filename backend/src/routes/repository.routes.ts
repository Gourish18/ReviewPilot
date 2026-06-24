import { Router } from 'express';
import { syncUserGithubRepositories, getUserRepositories, connectRepository, disconnectRepository } from '../controllers/repository.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Route to fetch repositories belonging to the authenticated user
router.get('/', requireAuth, getUserRepositories);

// Route to initiate repository synchronization from GitHub
router.post('/sync', requireAuth, syncUserGithubRepositories);

// Route to connect a repository (enable AI reviews)
router.post('/connect', requireAuth, connectRepository);

// Route to disconnect a repository (disable AI reviews)
router.post('/disconnect', requireAuth, disconnectRepository);

export default router;
