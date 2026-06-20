import mongoose from 'mongoose';
import { Order, OrderStatus, IOrder } from '../models/Order.js';
import { SlotCounter } from '../models/SlotCounter.js';
import { Settings } from '../models/Settings.js';
import { generateOrderId } from '../utils/generateOrderId.js';
import { notificationQueue } from '../queues/notification.queue.js'
import { logger } from '../utils/logger.js';
import { createError } from '../utils/errorHandler.js';
import { ServicePricing } from '../models/ServicePricing.js';
import {
  parseSlotMinutes,
  getISTNowMinutes,
  isTodayIST
} from '../utils/slotTime.js';
import { FinalServices } from '../models/Order.js';

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


    const LEAD_BUFFER_MIN = 60; // keep in sync with slot.service.ts

    if (isTodayIST(pickup)) {
      const slotMin = parseSlotMinutes(input.pickupSlot);
      const nowMin = getISTNowMinutes();

      if (slotMin < 0) {
        throw createError('Invalid slot format', 400);
      }
      if (slotMin < nowMin + LEAD_BUFFER_MIN) {
        throw createError('This slot is no longer available for today', 400);
      }
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

    // 5a. verify service prices against catalog (reject client-supplied prices)
    const verifiedServices = await Promise.all(
      input.services.map(async (s) => {
        const pricing = await ServicePricing.findOne({
          modelId: new mongoose.Types.ObjectId(input.modelId),
          serviceId: new mongoose.Types.ObjectId(s.serviceId),
          isActive: true,
        }).session(session);

        if (!pricing) {
          throw createError(`Service not available for this model: ${s.serviceName}`, 400);
        }

        return {
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          price: pricing.discountedPrice ?? pricing.price,
          selectedSymptoms: s.selectedSymptoms,
        };
      })
    );

    const estimatedAmount = verifiedServices.reduce((sum, s) => sum + s.price, 0);

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
        services: verifiedServices,
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
  await notificationQueue.add('send-whatsapp', {
    orderId: order._id.toString(),
    event: 'booking_confirmed',
    data: {
      orderId: order.orderId,
      date: input.pickupDate,
      slot: input.pickupSlot,
    },
  });

  return order;
};

// ── Update Status ─────────────────────────────────
export const updateOrderStatus = async (
  input: UpdateStatusInput,
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ orderId: input.orderId }).session(session);
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
      orderId,
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



export const submitEstimate = async (
  orderId: string,
  technicianId: string,
  inputServices: {
    serviceId?: string | null;
    serviceName: string;
    price?: number;        // only used for custom services
  }[],
  notes: string,
): Promise<IOrder> => {
  // 1. fetch the order first (need modelId for price lookup)
  const existing = await Order.findOne({
    orderId,
    technicianId: new mongoose.Types.ObjectId(technicianId),
    status: 'diagnosis_in_progress',
  });

  if (!existing) {
    throw createError('Order not found, not assigned to you, or not in diagnosis_in_progress state', 409);
  }

  // 2. build finalServices with VERIFIED prices
  const finalServices: FinalServices[] = [];

  for (const s of inputServices) {
    if (s.serviceId) {
      // catalog service → look up REAL price (ignore frontend price)
      const pricing = await ServicePricing.findOne({
        modelId: existing.modelId,
        serviceId: s.serviceId,
        isActive: true,
      }).populate('serviceId', 'name');

      if (!pricing) {
        throw createError(`Invalid service for this model: ${s.serviceName}`, 400);
      }

      const svc = pricing.serviceId as unknown as { name: string };

      finalServices.push({
        serviceId: pricing.serviceId,
        serviceName: svc.name,
        price: pricing.discountedPrice ?? pricing.price,  // catalog price ✅
      });
    } else {
      // custom "Other" service → trust technician's input
      if (!s.serviceName || typeof s.price !== 'number' || s.price <= 0) {
        throw createError('Custom service needs a name and valid price', 400);
      }

      finalServices.push({
        serviceId: null,
        serviceName: s.serviceName,
        price: s.price,
      });
    }
  }

  // 3. calculate total from VERIFIED prices
  const amount = finalServices.reduce((sum, s) => sum + s.price, 0);

  // 4. update order
  const order = await Order.findOneAndUpdate(
    {
      orderId,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: 'diagnosis_in_progress',
    },
    {
      $set: {
        finalServices,
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

  if (!order) {
    throw createError('Order not found or state changed', 409);
  }

  logger.info(`[ORDER] Estimate sent: ${order.orderId} — ₹${amount}`);

  await notificationQueue.add('send-whatsapp', {
    orderId: order._id.toString(),
    event: 'estimate_sent',
    data: {
      orderId: order.orderId,
      model: order.modelName,
      amount: amount.toString(),
    },
  });

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
      orderId,
      customerId: new mongoose.Types.ObjectId(customerId),
      status: 'estimate_sent',
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

  await notificationQueue.add('send-whatsapp', {
    orderId: order._id.toString(),
    event: action === 'rejected' ? 'customer_rejected' : 'customer_approved',
    data: { orderId: order.orderId },
  });

  return order;
};


// ── Start Diagnosis ───────────────────────────────
export const startDiagnosis = async (
  orderId: string,
  technicianId: string,
  notes?: string,
): Promise<IOrder> => {
  const order = await Order.findOneAndUpdate(
    {
      orderId,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: 'technician_assigned',
    },
    {
      $set: {
        status: 'diagnosis_in_progress',
        ...(notes ? { diagnosisNotes: notes } : {}),
      },
      $push: {
        statusHistory: {
          status: 'diagnosis_in_progress',
          updatedBy: new mongoose.Types.ObjectId(technicianId),
          note: 'Diagnosis started',
          timestamp: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!order) {
    throw createError(
      'Order not found, not assigned to you, or not in technician_assigned state',
      409,
    );
  }

  logger.info(`[ORDER] Diagnosis started: ${order.orderId}`);
  return order;
};


// ── Start Repair ──────────────────────────────────
export const startRepair = async (
  orderId: string,
  technicianId: string,
): Promise<IOrder> => {
  const order = await Order.findOneAndUpdate(
    {
      orderId,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: 'customer_approved',
    },
    {
      $set: { status: 'repair_in_progress' },
      $push: {
        statusHistory: {
          status: 'repair_in_progress',
          updatedBy: new mongoose.Types.ObjectId(technicianId),
          note: 'Repair started',
          timestamp: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!order) {
    throw createError(
      'Order not found, not assigned to you, or estimate not yet approved',
      409,
    );
  }

  logger.info(`[ORDER] Repair started: ${order.orderId}`);
  return order;
};


// ── Complete Repair ───────────────────────────────
export const completeRepair = async (
  orderId: string,
  technicianId: string,
  note?: string,
): Promise<IOrder> => {
  const order = await Order.findOneAndUpdate(
    {
      orderId,
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: 'repair_in_progress',
    },
    {
      $set: { status: 'ready_for_drop' },
      $push: {
        statusHistory: {
          status: 'ready_for_drop',
          updatedBy: new mongoose.Types.ObjectId(technicianId),
          note: note || 'Repair completed, ready for drop',
          timestamp: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!order) {
    throw createError(
      'Order not found, not assigned to you, or not in repair_in_progress state',
      409,
    );
  }

  logger.info(`[ORDER] Repair completed: ${order.orderId}`);
  return order;
};


// ── Upload Photos ─────────────────────────────────
export const uploadPhotos = async (
  orderId: string,
  technicianId: string,
  beforePhotos?: string[],
  afterPhotos?: string[],
): Promise<IOrder> => {
  const update: Record<string, string[]> = {};
  if (beforePhotos?.length) update.beforePhotos = beforePhotos;
  if (afterPhotos?.length) update.afterPhotos = afterPhotos;

  if (Object.keys(update).length === 0) {
    throw createError('No photos provided', 400);
  }

  const order = await Order.findOneAndUpdate(
    {
      orderId,
      technicianId: new mongoose.Types.ObjectId(technicianId),
    },
    { $set: update },
    { new: true },
  );

  if (!order) {
    throw createError('Order not found or not assigned to you', 409);
  }

  logger.info(`[ORDER] Photos uploaded: ${order.orderId}`);
  return order;
};