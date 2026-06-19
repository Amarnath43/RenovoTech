import mongoose from 'mongoose';
import { Brand }          from '../models/Brand.js';
import { Series }         from '../models/Series.js';
import { DeviceModel }    from '../models/DeviceModel.js';
import { ServicePricing } from '../models/ServicePricing.js';
import { asyncHandler }   from '../utils/asyncHandler.js';
import { createError }    from '../utils/errorHandler.js';

// Helper — Services + Pricing for a Model
const getModelServices = async (modelId: mongoose.Types.ObjectId | string) => {
  const pricing = await ServicePricing
    .find({ modelId, isActive: true })
    .populate('serviceId', 'name slug image repairTime warranty symptoms');

  return pricing.map((p) => {
    const service = p.serviceId as unknown as {
      _id:        mongoose.Types.ObjectId;
      name:       string;
      slug:       string;
      image:      string;
      repairTime: number;
      warranty:   number;
      symptoms:   { label: string; description: string; isActive: boolean }[];
    };

    return {
      serviceId:       service._id,
      serviceName:     service.name,
      serviceSlug:     service.slug,
      serviceImage:    service.image,
      price:           p.price,
      discountedPrice: p.discountedPrice,
      repairTime:      service.repairTime,
      warranty:        service.warranty,
      symptoms:        service.symptoms.filter((s) => s.isActive),
    };
  });
};

// Get All Brands
export const getBrands = asyncHandler(async (req, res) => {
  const brands = await Brand
    .find({ isActive: true })
    .sort('displayOrder')
    .select('name slug logo displayOrder');

  res.json({ success: true, brands });
});

// Get Series by Brand Slug (+ nested models)
export const getSeriesByBrand = asyncHandler(async (req, res) => {
  const { brandSlug } = req.params;

  const brand = await Brand.findOne({ slug: brandSlug, isActive: true });
  if (!brand) throw createError('Brand not found', 404);

  const seriesList = await Series
    .find({ brandId: brand._id, isActive: true })
    .sort('displayOrder');

  const series = await Promise.all(
    seriesList.map(async (s) => {
      const models = await DeviceModel
        .find({ seriesId: s._id, isActive: true })
        .sort('displayOrder')
        .select('name slug image displayOrder');

      return {
        id:           s._id,
        name:         s.name,
        slug:         s.slug,
        displayOrder: s.displayOrder,
        models,
      };
    }),
  );

  res.json({ success: true, series });
});

// Get Pricing/Services by Model ID
export const getModelPricing = asyncHandler(async (req, res) => {
  const modelId = req.params.modelId as string;

  if (!mongoose.Types.ObjectId.isValid(modelId)) {
    throw createError('Invalid model ID', 400);
  }

  const model = await DeviceModel.findOne({ _id: modelId, isActive: true });
  if (!model) throw createError('Model not found', 404);

  const services = await getModelServices(modelId);

  res.json({ success: true, services });
});