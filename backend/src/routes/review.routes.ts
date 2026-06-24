import { Router } from 'express';
import { getReviews, getReviewById } from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Retrieve paginated and filtered list of PR reviews (protected route)
router.get('/', requireAuth, getReviews);

// Retrieve a single PR review detail by document ID (protected route)
router.get('/:id', requireAuth, getReviewById);

export default router;
