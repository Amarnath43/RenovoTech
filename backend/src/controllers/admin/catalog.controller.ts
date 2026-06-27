import { asyncHandler } from '../../utils/asyncHandler.js';
import { createError } from '../../utils/errorHandler.js';
import {
  createBrand, listBrands, updateBrand,
  createSeries, listSeries, updateSeries,
  createModel, listModels, updateModel,
} from '../../services/admin/catalog.service.js';
import {
  createService, listServices, updateService,
} from '../../services/admin/catalog.service.js';



// helper: admin sees inactive too via ?includeInactive=true
const wantsInactive = (req: { query: Record<string, unknown> }) =>
  req.query.includeInactive === 'true';

// ═══════════════ BRAND ═══════════════

export const addBrand = asyncHandler(async (req, res) => {
  const brand = await createBrand(req.body);   // validated by Zod
  res.status(201).json({ success: true, message: 'Brand created', brand });
});

export const getBrands = asyncHandler(async (req, res) => {
  const brands = await listBrands(wantsInactive(req));
  res.json({ success: true, brands });
});

export const editBrand = asyncHandler(async (req, res) => {
  const brand = await updateBrand(req.params.brandId as string, req.body);
  res.json({ success: true, message: 'Brand updated', brand });
});

// ═══════════════ SERIES ═══════════════

export const addSeries = asyncHandler(async (req, res) => {
  const series = await createSeries(req.body);
  res.status(201).json({ success: true, message: 'Series created', series });
});

export const getSeries = asyncHandler(async (req, res) => {
  const brandId = req.query.brandId as string;
  if (!brandId) throw createError('brandId query param is required', 400);
  const series = await listSeries(brandId, wantsInactive(req));
  res.json({ success: true, series });
});

export const editSeries = asyncHandler(async (req, res) => {
  const series = await updateSeries(req.params.seriesId as string, req.body);
  res.json({ success: true, message: 'Series updated', series });
});

// ═══════════════ MODEL ═══════════════

export const addModel = asyncHandler(async (req, res) => {
  const model = await createModel(req.body);
  res.status(201).json({ success: true, message: 'Model created', model });
});

export const getModels = asyncHandler(async (req, res) => {
  const seriesId = req.query.seriesId as string;
  if (!seriesId) throw createError('seriesId query param is required', 400);
  const models = await listModels(seriesId, wantsInactive(req));
  res.json({ success: true, models });
});

export const editModel = asyncHandler(async (req, res) => {
  const model = await updateModel(req.params.modelId as string, req.body);
  res.json({ success: true, message: 'Model updated', model });
});

export const addService = asyncHandler(async (req, res) => {
  const service = await createService(req.body);
  res.status(201).json({ success: true, message: 'Service created', service });
});

export const getServices = asyncHandler(async (req, res) => {
  const services = await listServices(wantsInactive(req));
  res.json({ success: true, services });
});

export const editService = asyncHandler(async (req, res) => {
  const service = await updateService(req.params.serviceId as string, req.body);
  res.json({ success: true, message: 'Service updated', service });
});