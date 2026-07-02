import mongoose from 'mongoose';
import type { OrderStatus } from '../models/Order.js';

export const buildStatusHistoryEntry = (
  status: OrderStatus,
  updatedBy: string,
  note: string = '',
) => ({
  status,
  updatedBy: new mongoose.Types.ObjectId(updatedBy),
  note,
  timestamp: new Date(),
});
