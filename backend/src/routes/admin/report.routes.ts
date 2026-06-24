import { Router } from 'express';
import {
  getOverview,
  getRevenue,
} from '../../controllers/admin/report/report.controller.js';

const router = Router();

router.get('/overview', getOverview);
router.get('/revenue',  getRevenue);

export default router;