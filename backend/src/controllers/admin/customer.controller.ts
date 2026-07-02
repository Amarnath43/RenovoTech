import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createError }  from '../../utils/errorHandler.js';
import { parsePagination } from '../../utils/pagination.js';

// ── Get All Customers (Paginated + Search) ────────
export const getCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const search = (req.query.search as string)?.trim();

  const filter: Record<string, unknown> = { role: 'customer' };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (/^\d+$/.test(search)) {
      filter.phone = { $regex: `^${escaped}` };
    } else {
      filter.name = { $regex: `^${escaped}`, $options: 'i' };
    }
  }

  const [customers, total] = await Promise.all([
    User
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name phone isActive isProfileComplete createdAt lastLoginAt'),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ── Get Single Customer (+ order count) ───────────
export const getCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.customerId as string;

  const customer = await User
    .findOne({ _id: customerId, role: 'customer' })
    .select('-__v');

  if (!customer) throw createError('Customer not found', 404);

  const orderCount = await Order.countDocuments({
    customerId: new mongoose.Types.ObjectId(customerId),
  });

  res.json({
    success: true,
    customer,
    stats: { orderCount },
  });
});

// ── Update Customer (name, isActive) ──────────────
export const updateCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.customerId as string;

  const customer = await User.findOneAndUpdate(
    { _id: customerId, role: 'customer' },
    { $set: req.body },
    { new: true, runValidators: true },
  ).select('-__v');

  if (!customer) throw createError('Customer not found', 404);

  res.json({
    success: true,
    message: 'Customer updated',
    customer,
  });
});

// ── Get Customer's Orders (Paginated) ─────────────
export const getCustomerOrders = asyncHandler(async (req, res) => {
  const customerId = req.params.customerId as string;

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });

  const filter = { customerId: new mongoose.Types.ObjectId(customerId) };

  const [orders, total] = await Promise.all([
    Order
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('orderId status modelName estimatedAmount finalAmount paymentStatus pickupDate createdAt'),
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