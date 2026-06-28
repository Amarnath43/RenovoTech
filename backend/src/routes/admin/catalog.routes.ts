import { Router } from 'express';
import {
  addBrand, getBrands, editBrand,
  addSeries, getSeries, editSeries,
  addModel, getModels, editModel,
  addService, getServices, editService,
  addPricing, getPricing, editPricing,
} from '../../controllers/admin/catalog.controller.js';
import { validateBody, validateParam } from '../../middleware/validate.js';
import {
  createBrandSchema, updateBrandSchema,
  createSeriesSchema, updateSeriesSchema,
  createModelSchema, updateModelSchema,
  createServiceSchema, updateServiceSchema,
  createPricingSchema, updatePricingSchema,
  objectIdSchema,
} from '../../validators/schemas.js';

const router = Router();

// Brands
router.post('/brands',            validateBody(createBrandSchema),                                        addBrand);
router.get('/brands',             getBrands);
router.patch('/brands/:brandId',  validateParam('brandId', objectIdSchema),  validateBody(updateBrandSchema),   editBrand);

// Series
router.post('/series',            validateBody(createSeriesSchema),                                       addSeries);
router.get('/series',             getSeries);
router.patch('/series/:seriesId', validateParam('seriesId', objectIdSchema), validateBody(updateSeriesSchema),  editSeries);

// Models
router.post('/models',            validateBody(createModelSchema),                                        addModel);
router.get('/models',             getModels);
router.patch('/models/:modelId',  validateParam('modelId', objectIdSchema),  validateBody(updateModelSchema),   editModel);

// Services
router.post('/services',              validateBody(createServiceSchema),                                          addService);
router.get('/services',               getServices);
router.patch('/services/:serviceId',  validateParam('serviceId', objectIdSchema), validateBody(updateServiceSchema), editService);

// Pricing
router.post('/pricing',               validateBody(createPricingSchema),                                          addPricing);
router.get('/pricing',                getPricing);
router.patch('/pricing/:pricingId',   validateParam('pricingId', objectIdSchema), validateBody(updatePricingSchema), editPricing);

export default router;