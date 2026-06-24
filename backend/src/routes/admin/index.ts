import { Router } from 'express';
import { verifyToken, requireRole } from '../../middleware/auth.js';
import settingsRoutes from './settings.routes.js';
import customerRoutes from './customer.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

// All admin routes require auth + admin role
router.use(verifyToken);
router.use(requireRole('admin'));

// Mount sub-routes
router.use('/settings', settingsRoutes);
router.use('/customers', customerRoutes);
router.use('/reports', reportRoutes);

export default router;