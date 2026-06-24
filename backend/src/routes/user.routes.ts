import { Router } from 'express';
import { updateProfile } from '../controllers/user.controller.js';
import { verifyToken }   from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/schemas.js';

const router = Router();

router.patch('/profile', verifyToken,validateBody(updateProfileSchema), updateProfile);

export default router;