import { Router } from 'express';
import {
  getBrands,
  getSeriesByBrand,
  getModelPricing,
} from '../controllers/brand.controller.js';

const router = Router();

// Public Catalog Routes (no auth)
router.get('/brands',                   getBrands);
router.get('/brands/:brandSlug/series', getSeriesByBrand);
router.get('/models/:modelId/pricing',  getModelPricing);

export default router;