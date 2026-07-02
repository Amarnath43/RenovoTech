import { Order } from '../models/Order.js';
import {
    createOrder,
    respondToEstimate,
} from '../services/order.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/errorHandler.js';
import { parsePagination } from '../utils/pagination.js';

// ── Create Order ──────────────────────────────────
export const create = asyncHandler(async (req, res) => {
    const customerId = req.user?.id;
    if (!customerId) throw createError('Not authenticated', 401);

    const {
        brandId, seriesId, modelId, modelName,
        services, pickupAddress,
        contactName, contactPhone,
        pickupDate, pickupSlot,
    } = req.body;

    const order = await createOrder({
        customerId,
        brandId, seriesId, modelId,
        services, pickupAddress,
        contactName, contactPhone,
        pickupDate, pickupSlot,
    });

    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: {
            orderId: order.orderId,
            status: order.status,
            estimatedAmount: order.estimatedAmount,
            bookingFee: order.bookingFee,
            pickupDate: order.pickupDate,
            pickupSlot: order.pickupSlot,
            createdAt: order.createdAt,
        },
    });
});

// ── Get My Orders (Paginated) ─────────────────────
export const getMyOrders = asyncHandler(async (req, res) => {
    const customerId = req.user?.id;
    if (!customerId) throw createError('Not authenticated', 401);

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { customerId };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
        Order
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('orderId status modelName services pickupDate pickupSlot estimatedAmount finalAmount bookingFee paymentStatus customerApproval createdAt'),
        Order.countDocuments(filter),
    ]);

    res.json({
        success: true,
        orders,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
});

// ── Get Single Order ──────────────────────────────
export const getOrder = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { orderId } = req.params;

    if (!userId) throw createError('Not authenticated', 401);

    const order = await Order.findOne({ orderId });
    if (!order) throw createError('Order not found', 404);

    // authorization: customer owns it, OR admin/technician
    const isOwner = order.customerId.toString() === userId;
    const isStaff = role === 'admin' || role === 'technician';

    if (!isOwner && !isStaff) {
        throw createError('You are not authorized to view this order', 403);
    }

    res.json({ success: true, order });
});

// ── Respond to Estimate (Approve/Reject) ──────────
export const respondEstimate = asyncHandler(async (req, res) => {
    const customerId = req.user?.id;
    const orderId = req.params.orderId as string;
    const { action } = req.body;

    if (!customerId) throw createError('Not authenticated', 401);

    if (action !== 'approved' && action !== 'rejected') {
        throw createError('Action must be "approved" or "rejected"', 400);
    }

    const order = await respondToEstimate(orderId, customerId, action);

    res.json({
        success: true,
        message: `Estimate ${action}`,
        order: {
            orderId: order.orderId,
            status: order.status,
            customerApproval: order.customerApproval,
        },
    });
});