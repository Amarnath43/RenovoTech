import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  updateCustomer,
  getCustomerOrders,
} from '../../controllers/admin/customer.controller.js';

const router = Router();

router.get('/',                   getCustomers);
router.get('/:customerId',        getCustomer);
router.patch('/:customerId',      updateCustomer);
router.get('/:customerId/orders', getCustomerOrders);

export default router;