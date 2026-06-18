import { Router } from 'express';
import { updateProfile } from '../controllers/user.controller.js';
import { verifyToken }   from '../middleware/auth.js';

const router = Router();

router.patch('/profile', verifyToken, updateProfile);

export default router;