import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import {
  startDiagnosis,
  submitEstimate,
  startRepair,
  completeRepair,
  uploadPhotos,
} from '../services/order.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError }  from '../utils/errorHandler.js';

// ── Get My Assigned Jobs (lean list) ──────────────
export const getMyJobs = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  if (!technicianId) throw createError('Not authenticated', 401);

  const status = req.query.status as string | undefined;

  const filter: Record<string, unknown> = { technicianId };
  if (status) filter.status = status;

  const jobs = await Order
    .find(filter)
    .sort({ updatedAt: -1 })
    .select('orderId status modelName contactName pickupDate pickupSlot createdAt');

  res.json({ success: true, jobs });
});

// ── Get Single Job Detail ─────────────────────────
export const getJob = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  const orderId = req.params.orderId as string;

  if (!technicianId) throw createError('Not authenticated', 401);

  const order = await Order.findOne({
    orderId,
    technicianId: new mongoose.Types.ObjectId(technicianId),
  }).select('-__v');

  if (!order) {
    throw createError('Job not found or not assigned to you', 404);
  }

  res.json({ success: true, order });
});

// ── Start Diagnosis ───────────────────────────────
export const diagnose = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  if (!technicianId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;

  const order = await startDiagnosis(orderId, technicianId);

  res.json({
    success: true,
    message: 'Diagnosis started',
    order: { orderId: order.orderId, status: order.status },
  });
});

// ── Submit Estimate ───────────────────────────────
export const estimate = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  if (!technicianId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;
  const { services, notes } = req.body;

  if (!Array.isArray(services) || services.length === 0) {
    throw createError('At least one service is required', 400);
  }

  // service-level validation happens in submitEstimate
  // (catalog price verification + custom validation)
  const order = await submitEstimate(orderId, technicianId, services, notes || '');

  res.json({
    success: true,
    message: 'Estimate submitted',
    order: {
      orderId:         order.orderId,
      status:          order.status,
      finalServices:   order.finalServices,
      estimatedAmount: order.estimatedAmount,
    },
  });
});

// ── Start Repair ──────────────────────────────────
export const repair = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  if (!technicianId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;

  const order = await startRepair(orderId, technicianId);

  res.json({
    success: true,
    message: 'Repair started',
    order: { orderId: order.orderId, status: order.status },
  });
});

// ── Complete Repair ───────────────────────────────
export const complete = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  if (!technicianId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;
  const { note } = req.body;

  const order = await completeRepair(orderId, technicianId, note);

  res.json({
    success: true,
    message: 'Repair completed',
    order: { orderId: order.orderId, status: order.status },
  });
});

// ── Upload Photos ─────────────────────────────────
export const photos = asyncHandler(async (req, res) => {
  const technicianId = req.user?.id;
  if (!technicianId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;
  const { beforePhotos, afterPhotos } = req.body;

  const order = await uploadPhotos(orderId, technicianId, beforePhotos, afterPhotos);

  res.json({
    success: true,
    message: 'Photos uploaded',
    order: {
      orderId:      order.orderId,
      beforePhotos: order.beforePhotos,
      afterPhotos:  order.afterPhotos,
    },
  });
});