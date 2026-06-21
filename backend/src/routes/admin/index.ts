import { Router } from 'express';
import { verifyToken, requireRole } from '../../middleware/auth.js';
import settingsRoutes from './settings.route.js';
import customerRoutes from './customer.route.js';



const router = Router();

// All admin routes require auth + admin role
router.use(verifyToken);
router.use(requireRole('admin'));

// Mount sub-routes
router.use('/settings', settingsRoutes);
// (order, customer, report, brand → added as we build them)
router.use('/customers', customerRoutes);

export default router;