import { Router } from 'express';
import {
  create,
  getMyOrders,
  getOrder,
  respondEstimate,
} from '../controllers/order.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createOrderSchema, respondEstimateSchema } from '../validators/schemas.js';

const router = Router();

// All order routes require authentication
router.use(verifyToken);

// Customer-only routes
router.post('/',                           requireRole('customer'),validateBody(createOrderSchema), create);
router.get('/',                            requireRole('customer'), getMyOrders);
router.patch('/:orderId/estimate/respond', requireRole('customer'),validateBody(respondEstimateSchema), respondEstimate);

// Any authenticated user (owner or staff) — keep AFTER GET /
router.get('/:orderId', getOrder);

export default router;