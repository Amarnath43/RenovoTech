import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  updateCustomer,
  getCustomerOrders,
} from '../../controllers/admin/customer.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { updateCustomerSchema } from '../../validators/schemas.js';

const router = Router();

router.get('/',                   getCustomers);
router.get('/:customerId',        getCustomer);
router.patch('/:customerId',   validateBody(updateCustomerSchema),   updateCustomer);
router.get('/:customerId/orders', getCustomerOrders);

export default router;