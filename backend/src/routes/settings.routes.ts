import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getUserSettings, updateUserSettings } from '../controllers/settings.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getUserSettings);
router.put('/', updateUserSettings);

export default router;
