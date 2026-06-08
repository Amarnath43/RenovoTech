import mongoose from 'mongoose';
import { Order, OrderStatus, IOrder } from '../models/Order.js';
import { SlotCounter } from '../models/SlotCounter.js';
import { Settings } from '../models/Settings.js';
import { generateOrderId } from '../utils/generateOrderId.js';
import { notifyCustomer } from './notification.service.js';
import { logger } from '../utils/logger.js';
import { createError } from '../utils/errorHandler.js';

// ── Types ─────────────────────────────────────────
interface CreateOrderInput {
  customerId: string;
  brandId: string;
  seriesId: string;
  modelId: string;
  modelName: string;
  services: {
    serviceId: string;
    serviceName: string;
    price: number;
    selectedSymptoms: string[];
  }[];
  pickupAddress: {
    flatOrHouse: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
  };
  contactName: string;
  contactPhone: string;
  pickupDate: string;
  pickupSlot: string;
}

interface UpdateStatusInput {
  orderId: string;
  status: OrderStatus;
  updatedBy: string;
  note?: string;
}

// ── Create Order ──────────────────────────────────
export const createOrder = async (
  input: CreateOrderInput,
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let order!: IOrder;

  try {
    // 1. get settings
    const settings = await Settings.findOne();
    if (!settings) throw createError('Settings not configured', 500);

    // 2. check pickup & drop enabled
    if (!settings.pickupDropEnabled) {
      throw createError('Pickup & Drop service is currently unavailable', 503);
    }

    // 3. validate pickup date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const pickup = new Date(input.pickupDate);
    pickup.setUTCHours(0, 0, 0, 0);

    if (pickup < today) {
      throw createError('Pickup date cannot be in the past', 400);
    }

    const maxDate = new Date(today);
    maxDate.setUTCDate(today.getUTCDate() + settings.calendarDays);
    if (pickup > maxDate) {
      throw createError(`Pickup date must be within ${settings.calendarDays} days from today`, 400);
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[pickup.getUTCDay()];
    if (!settings.workingDays.includes(dayName)) {
      throw createError('Selected date is not a working day', 400);
    }

    // 4. check slot availability atomically
    let slotCounter;
    try {
      slotCounter = await SlotCounter.findOneAndUpdate(
        {
          date: new Date(input.pickupDate),
          slot: input.pickupSlot,
          count: { $lt: settings.maxPickupsPerSlot }
        },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            date: new Date(input.pickupDate),
            slot: input.pickupSlot,
          }
        },
        { new: true, upsert: true, session }
      )
    } catch (err: any) {
      if (err.code === 11000) {
        throw createError('Selected slot is full', 409);
      }
      throw err;
    }

    if (!slotCounter) {
      throw createError('Selected slot is full. Please choose another slot.', 409);
    }

    const estimatedAmount = input.services.reduce(
      (sum, s) => sum + s.price, 0
    );

    // 5. get booking fee from settings
    const bookingFee = settings.bookingFeeEnabled
      ? settings.bookingFee
      : 0;

    // 6. generate order ID
    const orderId = await generateOrderId(session);

    // 7. create order
    [order] = await Order.create(
      [{
        orderId,
        customerId: input.customerId,
        brandId: input.brandId,
        seriesId: input.seriesId,
        modelId: input.modelId,
        modelName: input.modelName,
        services: input.services,
        pickupAddress: input.pickupAddress,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        pickupDate: new Date(input.pickupDate),
        pickupSlot: input.pickupSlot,
        estimatedAmount,
        bookingFee,
        status: 'booked',
        statusHistory: [{
          status: 'booked',
          updatedBy: new mongoose.Types.ObjectId(input.customerId),
          note: 'Order placed by customer',
          timestamp: new Date(),
        }],
      }],
      { session }
    );

    // 8. commit transaction
    await session.commitTransaction();

  } catch (err) {
    await session.abortTransaction();
    logger.error(`[ORDER] Create failed: ${err}`);
    throw err;
  } finally {
    session.endSession();
  }

  logger.info(`[ORDER] Created: ${order.orderId}`);

  // 9. notify customer (outside transaction)
  await notifyCustomer(
    order._id as mongoose.Types.ObjectId,
    'booking_confirmed',
    {
      orderId: order.orderId,
      date: input.pickupDate,
      slot: input.pickupSlot,
    },
  );

  return order;
};

// ── Update Status ─────────────────────────────────
export const updateOrderStatus = async (
  input: UpdateStatusInput,
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(input.orderId).session(session);
    if (!order) throw createError('Order not found', 404);

    // update status + push to history atomically
    order.status = input.status;
    order.statusHistory.push({
      status: input.status,
      updatedBy: new mongoose.Types.ObjectId(input.updatedBy),
      note: input.note || '',
      timestamp: new Date(),
    });

    await order.save({ session });
    await session.commitTransaction();

    logger.info(`[ORDER] Status updated: ${order.orderId} → ${input.status}`);

    return order;

  } catch (err) {
    await session.abortTransaction();
    logger.error(`[ORDER] Status update failed: ${err}`);
    throw err;
  } finally {
    session.endSession();
  }
};

// ── Assign Technician ─────────────────────────────
export const assignTechnician = async (
  orderId: string,
  technicianId: string,
  adminId: string,
): Promise<IOrder> => {

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: 'device_received',
    },
    {
      $set: {
        status: 'technician_assigned',
        technicianId: new mongoose.Types.ObjectId(technicianId),
      },
      $push: {
        statusHistory: {
          status: 'technician_assigned',
          updatedBy: new mongoose.Types.ObjectId(adminId),
          note: 'Technician assigned by admin',
          timestamp: new Date(),
        },
      },
    },
    {
      new: true,
    }
  );

  if (!order) {
    throw createError(
      'Order not found or not in device_received state',
      409
    );
  }

  logger.info(`[ORDER] Technician assigned: ${order.orderId}`);

  return order;
};

// ── Submit Estimate ───────────────────────────────
export const submitEstimate = async (
  orderId: string,
  technicianId: string,
  amount: number,
  notes: string,
): Promise<IOrder> => {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: 'diagnosis_in_progress',
    },
    {
      $set: {
        estimatedAmount: amount,
        diagnosisNotes: notes,
        estimateSentAt: new Date(),
        customerApproval: 'pending',
        status: 'estimate_sent',
      },
      $push: {
        statusHistory: {
          status: 'estimate_sent',
          updatedBy: new mongoose.Types.ObjectId(technicianId),
          note: `Estimate submitted: ₹${amount}`,
          timestamp: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!order) throw createError('Order not found or not in diagnosis_in_progress state', 409);

  logger.info(`[ORDER] Estimate sent: ${order.orderId} — ₹${amount}`);

  const serviceNames = order.services.map(s => s.serviceName).join(', ');

  await notifyCustomer(
    order._id as mongoose.Types.ObjectId,
    'estimate_sent',
    {
      orderId: order.orderId,
      model: order.modelName,
      services: serviceNames,
      amount: amount.toString(),
    },
  );

  return order;
};



// ── Approve / Reject Estimate ─────────────────────
export const respondToEstimate = async (
  orderId: string,
  customerId: string,
  action: 'approved' | 'rejected',
): Promise<IOrder> => {
  const newStatus: OrderStatus = action === 'approved'
    ? 'customer_approved'
    : 'customer_rejected';

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      customerId: new mongoose.Types.ObjectId(customerId),
      customerApproval: 'pending',
    },
    {
      $set: {
        customerApproval: action,
        status: newStatus,
      },
      $push: {
        statusHistory: {
          status: newStatus,
          updatedBy: new mongoose.Types.ObjectId(customerId),
          note: `Customer ${action} the estimate`,
          timestamp: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!order) {
    throw createError('Estimate already responded to or order not found', 409);
  }

  logger.info(`[ORDER] Estimate ${action}: ${order.orderId}`);

  await notifyCustomer(
    order._id as mongoose.Types.ObjectId,
    action === 'approved' ? 'customer_approved' : 'customer_rejected',
    { orderId: order.orderId },
  );

  return order;
};