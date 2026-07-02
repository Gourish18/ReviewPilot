import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Route to fetch compiled database metrics and activity logs for the dashboard
router.get('/', requireAuth, getDashboardData);

export default router;
