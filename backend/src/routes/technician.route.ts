import { Router } from 'express';
import {
  getMyJobs,
  getJob,
  diagnose,
  estimate,
  repair,
  complete,
  photos,
} from '../controllers/technician.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All technician routes require auth + technician role
router.use(verifyToken);
router.use(requireRole('technician'));

router.get('/orders',                    getMyJobs);
router.get('/orders/:orderId',           getJob);
router.patch('/orders/:orderId/diagnosis', diagnose);
router.patch('/orders/:orderId/estimate',  estimate);
router.patch('/orders/:orderId/repair',    repair);
router.patch('/orders/:orderId/complete',  complete);
router.patch('/orders/:orderId/photos',    photos);

export default router;