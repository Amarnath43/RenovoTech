import mongoose from 'mongoose';
import { Order, OrderStatus, IOrder } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { logger } from '../../utils/logger.js';
import { createError } from '../../utils/errorHandler.js';
import { canAdminTransition } from '../../utils/orderTransitions.js';
import { notificationQueue } from '../../queues/notification.queue.js';
import { NotificationEvent } from '../../models/Notification.js';
import { buildStatusHistoryEntry } from '../../utils/statusHistory.js';
import { parseDateRangeFilter } from '../../utils/dateRangeFilter.js';

const STATUS_EVENTS: Partial<Record<OrderStatus, NotificationEvent>> = {
    pickup_scheduled: 'pickup_scheduled',
    device_picked_up: 'device_picked_up',
    out_for_delivery: 'out_for_delivery',
    completed: 'completed',
    cancelled: 'cancelled',
};

// ── Get All Orders (Cursor Pagination + Filters) ──
export const getAllOrders = async (params: {
    cursor?: string;
    limit: number;
    status?: OrderStatus;
    startDate?: string;
    endDate?: string;
}): Promise<{ orders: IOrder[]; nextCursor: string | null; hasMore: boolean }> => {
    const { cursor, limit, status, startDate, endDate } = params;

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;

    const dateFilter = parseDateRangeFilter(startDate, endDate);
    if (dateFilter) filter.createdAt = dateFilter;

    // cursor: fetch orders with _id < cursor (newest first)
    if (cursor) {
        if (!mongoose.Types.ObjectId.isValid(cursor)) {
            throw createError('Invalid cursor', 400);
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // fetch limit + 1 to detect a next page
    const orders = await Order.find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('orderId customerId technicianId modelName status estimatedAmount finalAmount paymentStatus pickupDate pickupSlot createdAt completedAt')
        .populate('customerId', 'name phone');

    const hasMore = orders.length > limit;
    const page = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

    return { orders: page, nextCursor, hasMore };
};

// ── Get Single Order (Full Detail) ────────────────
export const getOrderDetail = async (orderId: string): Promise<IOrder> => {
    const order = await Order.findOne({ orderId })
        .populate('customerId', 'name phone')
        .populate('technicianId', 'name phone')
        .populate('brandId', 'name')
        .populate('seriesId', 'name')
        .select('-__v');

    if (!order) throw createError('Order not found', 404);
    return order;
};

// ── Update Status (State Machine) ─────────────────
export const adminUpdateStatus = async (params: {
    orderId: string;
    newStatus: OrderStatus;
    adminId: string;
    note?: string;
    finalAmount?: number;
}): Promise<IOrder> => {
    const { orderId, newStatus, adminId, note, finalAmount } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findOne({ orderId }).session(session);
        if (!order) throw createError('Order not found', 404);

        // validate the transition (state machine)
        if (!canAdminTransition(order.status, newStatus)) {
            throw createError(
                `Cannot change status from '${order.status}' to '${newStatus}'`,
                409,
            );
        }

        const updates: Record<string, unknown> = { status: newStatus };

        // completing the order → set revenue fields
        if (newStatus === 'completed') {
            updates.completedAt = new Date();
            updates.finalAmount = finalAmount ?? order.estimatedAmount;
        }

        order.set(updates);
        order.statusHistory.push(
            buildStatusHistoryEntry(newStatus, adminId, note || `Status changed to ${newStatus} by admin`),
        );

        await order.save({ session });
        await session.commitTransaction();

        logger.info(`[ADMIN ORDER] ${order.orderId}: → ${newStatus}`);

        // replace the notification block with:
        const event = STATUS_EVENTS[newStatus];
        if (event) {
            await notificationQueue.add('send-whatsapp', {
                orderId: order._id.toString(),
                event,
                data: { orderId: order.orderId, status: newStatus },
            });
        }

        return order;

    } catch (err) {
        await session.abortTransaction();
        logger.error(`[ADMIN ORDER] Status update failed: ${err}`);
        throw err;
    } finally {
        session.endSession();
    }
};

export const adminAssignTechnician = async (params: {
    orderId: string;
    technicianId: string;
    adminId: string;
}): Promise<IOrder> => {
    const { orderId, technicianId, adminId } = params;

    // verify the technician exists, is active, and IS a technician
    const tech = await User.findOne({
        _id: new mongoose.Types.ObjectId(technicianId),
        role: 'technician',
        isActive: true,
    }).select('_id');

    if (!tech) {
        throw createError('Invalid or inactive technician', 400);
    }

    const order = await Order.findOneAndUpdate(
        { orderId, status: 'device_received' },
        {
            $set: {
                status: 'technician_assigned',
                technicianId: new mongoose.Types.ObjectId(technicianId),
            },
            $push: {
                statusHistory: buildStatusHistoryEntry(
                    'technician_assigned',
                    adminId,
                    'Technician assigned by admin',
                ),
            },
        },
        { new: true },
    );

    if (!order) {
        throw createError('Order not found or not in device_received state', 409);
    }

    logger.info(`[ADMIN ORDER] Technician assigned: ${order.orderId}`);
    return order;
};