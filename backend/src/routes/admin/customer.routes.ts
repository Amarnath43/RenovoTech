import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  updateCustomer,
  getCustomerOrders,
} from '../../controllers/admin/customer.controller.js';
import { validateBody, validateParam } from '../../middleware/validate.js';
import { updateCustomerSchema, objectIdSchema } from '../../validators/schemas.js';

const router = Router();

router.get('/',                   getCustomers);
router.get('/:customerId',        validateParam('customerId', objectIdSchema), getCustomer);
router.patch('/:customerId',      validateParam('customerId', objectIdSchema), validateBody(updateCustomerSchema), updateCustomer);
router.get('/:customerId/orders', validateParam('customerId', objectIdSchema), getCustomerOrders);

export default router;