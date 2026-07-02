import { Router } from 'express';
import {
  getBrands,
  getSeriesByBrand,
  getModelPricing,
} from '../controllers/brand.controller.js';
import { validateParam } from '../middleware/validate.js';
import { objectIdSchema } from '../validators/schemas.js';

const router = Router();

// Public Catalog Routes (no auth)
router.get('/brands',                   getBrands);
router.get('/brands/:brandSlug/series', getSeriesByBrand);
router.get('/models/:modelId/pricing',  validateParam('modelId', objectIdSchema), getModelPricing);

export default router;