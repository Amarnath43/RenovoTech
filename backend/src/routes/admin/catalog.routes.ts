import { Router } from 'express';
import {
  addBrand, getBrands, editBrand,
  addSeries, getSeries, editSeries,
  addModel, getModels, editModel,
} from '../../controllers/admin/catalog.controller.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createBrandSchema, updateBrandSchema,
  createSeriesSchema, updateSeriesSchema,
  createModelSchema, updateModelSchema,
} from '../../validators/schemas.js';
import { addService, getServices, editService } from '../../controllers/admin/catalog.controller.js';
import { createServiceSchema, updateServiceSchema } from '../../validators/schemas.js';

const router = Router();

// Brands
router.post('/brands',            validateBody(createBrandSchema),  addBrand);
router.get('/brands',             getBrands);
router.patch('/brands/:brandId',  validateBody(updateBrandSchema),  editBrand);

// Series
router.post('/series',            validateBody(createSeriesSchema), addSeries);
router.get('/series',             getSeries);                       // ?brandId=
router.patch('/series/:seriesId', validateBody(updateSeriesSchema), editSeries);

// Models
router.post('/models',            validateBody(createModelSchema),  addModel);
router.get('/models',             getModels);                       // ?seriesId=
router.patch('/models/:modelId',  validateBody(updateModelSchema),  editModel);



router.post('/services',              validateBody(createServiceSchema), addService);
router.get('/services',               getServices);
router.patch('/services/:serviceId',  validateBody(updateServiceSchema), editService);

export default router;