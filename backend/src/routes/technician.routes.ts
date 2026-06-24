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
import { validateBody } from '../middleware/validate.js';
import {uploadPhotosSchema, completeRepairSchema, submitEstimateSchema} from '../validators/schemas.js';

const router = Router();

// All technician routes require auth + technician role
router.use(verifyToken);
router.use(requireRole('technician'));

router.get('/orders',                    getMyJobs);
router.get('/orders/:orderId',           getJob);
router.patch('/orders/:orderId/diagnosis', diagnose);
router.patch('/orders/:orderId/estimate', validateBody(submitEstimateSchema), estimate);
router.patch('/orders/:orderId/repair',    repair);
router.patch('/orders/:orderId/complete', validateBody(completeRepairSchema), complete);
router.patch('/orders/:orderId/photos',    validateBody(uploadPhotosSchema), photos);

export default router;