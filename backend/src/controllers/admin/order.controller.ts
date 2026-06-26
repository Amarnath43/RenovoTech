import { asyncHandler } from '../../utils/asyncHandler.js';
import { createError } from '../../utils/errorHandler.js';
import { OrderStatus } from '../../models/Order.js';
import {
  getAllOrders,
  getOrderDetail,
  adminUpdateStatus,
  adminAssignTechnician,
} from '../../services/admin/order.service.js';

// ── Get All Orders (Cursor + Filters) ─────────────
export const listOrders = asyncHandler(async (req, res) => {
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
  const cursor = req.query.cursor as string | undefined;
  const status = req.query.status as OrderStatus | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate   = req.query.endDate as string | undefined;

  const result = await getAllOrders({ cursor, limit, status, startDate, endDate });

  res.json({
    success: true,
    orders: result.orders,
    pagination: {
      nextCursor: result.nextCursor,
      hasMore:    result.hasMore,
      limit,
    },
  });
});

// ── Get Single Order ──────────────────────────────
export const getOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId as string;
  const order = await getOrderDetail(orderId);

  res.json({ success: true, order });
});

// ── Update Status ─────────────────────────────────
export const updateStatus = asyncHandler(async (req, res) => {
  const adminId = req.user?.id;
  if (!adminId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;

  // req.body validated by Zod (updateOrderStatusSchema)
  const { status, note, finalAmount } = req.body;

  const order = await adminUpdateStatus({
    orderId,
    newStatus: status,
    adminId,
    note,
    finalAmount,
  });

  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    order: {
      orderId:     order.orderId,
      status:      order.status,
      completedAt: order.completedAt,
      finalAmount: order.finalAmount,
    },
  });
});

// ── Assign Technician ─────────────────────────────
export const assignTech = asyncHandler(async (req, res) => {
  const adminId = req.user?.id;
  if (!adminId) throw createError('Not authenticated', 401);
  const orderId = req.params.orderId as string;

  // req.body validated by Zod (assignTechnicianSchema)
  const { technicianId } = req.body;

  const order = await adminAssignTechnician({ orderId, technicianId, adminId });

  res.json({
    success: true,
    message: 'Technician assigned',
    order: {
      orderId:      order.orderId,
      status:       order.status,
      technicianId: order.technicianId,
    },
  });
});