import { Router } from 'express';
import { verifyToken, requireRole } from '../../middleware/auth.js';
import settingsRoutes from './settings.routes.js';
import customerRoutes from './customer.routes.js';
import reportRoutes from './report.routes.js';
import orderRoutes from './order.routes.js';
import catalogRoutes from './catalog.routes.js';

const router = Router();

// All admin routes require auth + admin role
router.use(verifyToken);
router.use(requireRole('admin'));

// Mount sub-routes
router.use('/settings', settingsRoutes);
router.use('/customers', customerRoutes);
router.use('/reports', reportRoutes);
router.use('/orders', orderRoutes);
router.use('/catalog', catalogRoutes);

export default router;