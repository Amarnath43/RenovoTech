import { Router } from 'express';
import {
  listOrders,
  getOrder,
  updateStatus,
  assignTech,
} from '../../controllers/admin/order.controller.js';
import { validateBody } from '../../middleware/validate.js';
import {
  updateOrderStatusSchema,
  assignTechnicianSchema,
} from '../../validators/schemas.js';

const router = Router();

router.get('/',                  listOrders);
router.get('/:orderId',          getOrder);
router.patch('/:orderId/status', validateBody(updateOrderStatusSchema), updateStatus);
router.patch('/:orderId/assign', validateBody(assignTechnicianSchema),  assignTech);

export default router;