import mongoose from 'mongoose';
import { Brand, IBrand } from '../../models/Brand.js';
import { Series, ISeries } from '../../models/Series.js';
import { DeviceModel, IDeviceModel } from '../../models/DeviceModel.js';
import { generateSlug } from '../../utils/generateSlug.js';
import { createError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { Service, IService } from '../../models/Service.js';
import { ServicePricing, IServicePricing } from '../../models/ServicePricing.js';

// ═══════════════ BRAND ═══════════════

export const createBrand = async (input: {
  name: string;
  logo?: string;
  displayOrder?: number;
}): Promise<IBrand> => {
  const slug = generateSlug(input.name);

  const exists = await Brand.findOne({ $or: [{ name: input.name }, { slug }] });
  if (exists) throw createError('Brand with this name already exists', 409);

  const brand = await Brand.create({
    name: input.name,
    slug,
    logo: input.logo ?? '',
    displayOrder: input.displayOrder ?? 0,
  });

  logger.info(`[CATALOG] Brand created: ${brand.name}`);
  return brand;
};

export const listBrands = async (includeInactive: boolean): Promise<IBrand[]> => {
  const filter = includeInactive ? {} : { isActive: true };
  return Brand.find(filter).sort({ displayOrder: 1, name: 1 });
};

export const updateBrand = async (
  brandId: string,
  updates: Partial<{ name: string; logo: string; displayOrder: number; isActive: boolean }>,
): Promise<IBrand> => {
  const patch: Record<string, unknown> = { ...updates };

  // if name changes, regenerate slug + check uniqueness
  if (updates.name) {
    const slug = generateSlug(updates.name);
    const clash = await Brand.findOne({
      _id: { $ne: brandId },
      $or: [{ name: updates.name }, { slug }],
    });
    if (clash) throw createError('Another brand with this name exists', 409);
    patch.slug = slug;
  }

  const brand = await Brand.findByIdAndUpdate(brandId, { $set: patch }, { new: true });
  if (!brand) throw createError('Brand not found', 404);

  // cascade deactivation
  if (updates.isActive === false) {
    const modelIds = (await DeviceModel.find({ brandId }).select('_id')).map((m) => m._id);
    await Series.updateMany({ brandId }, { $set: { isActive: false } });
    await DeviceModel.updateMany({ brandId }, { $set: { isActive: false } });
    await ServicePricing.updateMany({ modelId: { $in: modelIds } }, { $set: { isActive: false } });
    logger.info(`[CATALOG] Brand deactivated + cascaded: ${brand.name}`);
  }

  return brand;
};

// ═══════════════ SERIES ═══════════════

export const createSeries = async (input: {
  brandId: string;
  name: string;
  displayOrder?: number;
}): Promise<ISeries> => {
  const brand = await Brand.findById(input.brandId, { isActive: true }).select('_id');
  if (!brand) throw createError('Brand not found', 404);

  const slug = generateSlug(input.name);

  const exists = await Series.findOne({ brandId: input.brandId, slug });
  if (exists) throw createError('Series with this name already exists for this brand', 409);

  const series = await Series.create({
    brandId: new mongoose.Types.ObjectId(input.brandId),
    name: input.name,
    slug,
    displayOrder: input.displayOrder ?? 0,
  });

  logger.info(`[CATALOG] Series created: ${series.name}`);
  return series;
};

export const listSeries = async (
  brandId: string,
  includeInactive: boolean,
): Promise<ISeries[]> => {
  if (!mongoose.Types.ObjectId.isValid(brandId)) {
    throw createError('Invalid brand ID', 400);
  }
  const filter: Record<string, unknown> = { brandId: new mongoose.Types.ObjectId(brandId) };
  if (!includeInactive) filter.isActive = true;
  return Series.find(filter).sort({ displayOrder: 1, name: 1 });
};

export const updateSeries = async (
  seriesId: string,
  updates: Partial<{ name: string; displayOrder: number; isActive: boolean }>,
): Promise<ISeries> => {
  const existing = await Series.findById(seriesId);
  if (!existing) throw createError('Series not found', 404);

  const patch: Record<string, unknown> = { ...updates };

  if (updates.name) {
    const slug = generateSlug(updates.name);
    const clash = await Series.findOne({
      _id: { $ne: seriesId },
      brandId: existing.brandId,
      slug,
    });
    if (clash) throw createError('Another series with this name exists for this brand', 409);
    patch.slug = slug;
  }

  const series = await Series.findByIdAndUpdate(seriesId, { $set: patch }, { new: true });
  if (!series) throw createError('Series not found', 404);

  // cascade deactivation
  if (updates.isActive === false) {
    await DeviceModel.updateMany({ seriesId }, { $set: { isActive: false } });
    const modelIds = (await DeviceModel.find({ seriesId }).select('_id')).map((m) => m._id);
    await ServicePricing.updateMany({ modelId: { $in: modelIds } }, { $set: { isActive: false } });
    logger.info(`[CATALOG] Series deactivated + cascaded: ${series.name}`);
  }

  return series;
};

// ═══════════════ MODEL ═══════════════

export const createModel = async (input: {
  seriesId: string;
  name: string;
  image?: string;
  displayOrder?: number;
}): Promise<IDeviceModel> => {
  // derive brandId from the series (single source of truth)
  const series = await Series.findOne({ _id: input.seriesId, isActive: true }, { _id: 1, brandId: 1 });
  if (!series) throw createError('Series not found', 404);

  const slug = generateSlug(input.name);

  const exists = await DeviceModel.findOne({ seriesId: input.seriesId, slug });
  if (exists) throw createError('Model with this name already exists for this series', 409);

  const model = await DeviceModel.create({
    brandId: series.brandId,       // derived ✅
    seriesId: series._id,
    name: input.name,
    slug,
    image: input.image ?? '',
    displayOrder: input.displayOrder ?? 0,
  });

  logger.info(`[CATALOG] Model created: ${model.name}`);
  return model;
};

export const listModels = async (
  seriesId: string,
  includeInactive: boolean,
): Promise<IDeviceModel[]> => {
  if (!mongoose.Types.ObjectId.isValid(seriesId)) {
    throw createError('Invalid series ID', 400);
  }
  const filter: Record<string, unknown> = { seriesId: new mongoose.Types.ObjectId(seriesId) };
  if (!includeInactive) filter.isActive = true;
  return DeviceModel.find(filter).sort({ displayOrder: 1, name: 1 });
};

export const updateModel = async (
  modelId: string,
  updates: Partial<{ name: string; image: string; displayOrder: number; isActive: boolean }>,
): Promise<IDeviceModel> => {
  const existing = await DeviceModel.findById(modelId);
  if (!existing) throw createError('Model not found', 404);

  const patch: Record<string, unknown> = { ...updates };

  if (updates.name) {
    const slug = generateSlug(updates.name);
    const clash = await DeviceModel.findOne({
      _id: { $ne: modelId },
      seriesId: existing.seriesId,
      slug,
    });
    if (clash) throw createError('Another model with this name exists for this series', 409);
    patch.slug = slug;
  }

  const model = await DeviceModel.findByIdAndUpdate(modelId, { $set: patch }, { new: true });
  if (!model) throw createError('Model not found', 404);

  // cascade deactivation
  if (updates.isActive === false) {
    await ServicePricing.updateMany({ modelId }, { $set: { isActive: false } });
    logger.info(`[CATALOG] Model deactivated + cascaded: ${model.name}`);
  }

  return model;
};


export const createService = async (input: {
  name: string;
  image?: string;
  repairTime?: number;
  warranty?: number;
  symptoms?: { label: string; isActive?: boolean }[];
}): Promise<IService> => {
  const slug = generateSlug(input.name);

  const exists = await Service.findOne({ $or: [{ name: input.name }, { slug }] });
  if (exists) throw createError('Service with this name already exists', 409);

  const service = await Service.create({
    name: input.name,
    slug,
    image: input.image ?? '',
    repairTime: input.repairTime ?? 60,
    warranty: input.warranty ?? 90,
    symptoms: input.symptoms ?? [],
  });

  logger.info(`[CATALOG] Service created: ${service.name}`);
  return service;
};

export const listServices = async (includeInactive: boolean): Promise<IService[]> => {
  const filter = includeInactive ? {} : { isActive: true };
  return Service.find(filter).sort({ name: 1 });
};

export const updateService = async (
  serviceId: string,
  updates: Partial<{
    name: string;
    image: string;
    repairTime: number;
    warranty: number;
    symptoms: { label: string; isActive?: boolean }[];
    isActive: boolean;
  }>,
): Promise<IService> => {
  const patch: Record<string, unknown> = { ...updates };

  if (updates.name) {
    const slug = generateSlug(updates.name);
    const clash = await Service.findOne({
      _id: { $ne: serviceId },
      $or: [{ name: updates.name }, { slug }],
    });
    if (clash) throw createError('Another service with this name exists', 409);
    patch.slug = slug;
  }

  const service = await Service.findByIdAndUpdate(serviceId, { $set: patch }, { new: true });
  if (!service) throw createError('Service not found', 404);

  // cascade deactivation → pricing referencing this service
  if (updates.isActive === false) {
    await ServicePricing.updateMany({ serviceId }, { $set: { isActive: false } });
    logger.info(`[CATALOG] Service deactivated + cascaded: ${service.name}`);
  }

  return service;
};



// ═══════════════ PRICING ═══════════════

export const createPricing = async (input: {
  modelId: string;
  serviceId: string;
  price: number;
  discountedPrice?: number | null;
}): Promise<IServicePricing> => {
  // verify model exists + is active
  const model = await DeviceModel.findOne({ _id: input.modelId, isActive: true }).select('_id');
  if (!model) throw createError('Model not found or inactive', 404);

  // verify service exists + is active
  const service = await Service.findOne({ _id: input.serviceId, isActive: true }).select('_id');
  if (!service) throw createError('Service not found or inactive', 404);

  // enforce one price per model+service (unique constraint)
  const exists = await ServicePricing.findOne({
    modelId: input.modelId,
    serviceId: input.serviceId,
  });
  if (exists) {
    throw createError('Pricing already exists for this model and service', 409);
  }

  const pricing = await ServicePricing.create({
    modelId: new mongoose.Types.ObjectId(input.modelId),
    serviceId: new mongoose.Types.ObjectId(input.serviceId),
    price: input.price,
    discountedPrice: input.discountedPrice ?? null,
  });

  logger.info(`[CATALOG] Pricing created: model ${input.modelId} + service ${input.serviceId} = ₹${input.price}`);
  return pricing;
};

export const listPricing = async (params: {
  modelId?: string;
  serviceId?: string;
  includeInactive: boolean;
}): Promise<IServicePricing[]> => {
  const { modelId, serviceId, includeInactive } = params;

  if (!modelId && !serviceId) {
    throw createError('Provide modelId or serviceId to list pricing', 400);
  }

  const filter: Record<string, unknown> = {};
  if (modelId) {
    if (!mongoose.Types.ObjectId.isValid(modelId)) throw createError('Invalid model ID', 400);
    filter.modelId = new mongoose.Types.ObjectId(modelId);
  }
  if (serviceId) {
    if (!mongoose.Types.ObjectId.isValid(serviceId)) throw createError('Invalid service ID', 400);
    filter.serviceId = new mongoose.Types.ObjectId(serviceId);
  }
  if (!includeInactive) filter.isActive = true;

  return ServicePricing.find(filter)
    .populate('modelId', 'name')
    .populate('serviceId', 'name')
    .sort({ createdAt: -1 });
};

export const updatePricing = async (
  pricingId: string,
  updates: Partial<{ price: number; discountedPrice: number | null; isActive: boolean }>,
): Promise<IServicePricing> => {
  const existing = await ServicePricing.findById(pricingId);
  if (!existing) throw createError('Pricing not found', 404);

  // validate discount ≤ price (using new or existing price)
  const finalPrice = updates.price ?? existing.price;
  const finalDiscount = updates.discountedPrice !== undefined
    ? updates.discountedPrice
    : existing.discountedPrice;

  if (finalDiscount != null && finalDiscount > finalPrice) {
    throw createError('Discounted price cannot exceed price', 400);
  }

  const pricing = await ServicePricing.findByIdAndUpdate(
    pricingId,
    { $set: updates },
    { new: true },
  );
  if (!pricing) throw createError('Pricing not found', 404);

  logger.info(`[CATALOG] Pricing updated: ${pricingId}`);
  return pricing;
};