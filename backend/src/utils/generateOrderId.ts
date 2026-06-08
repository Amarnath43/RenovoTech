import mongoose from 'mongoose';
import { Settings } from '../models/Settings.js';

export const generateOrderId = async (
  session?: mongoose.ClientSession,
): Promise<string> => {
  const year = new Date().getFullYear();

  const settings = await Settings.findOneAndUpdate(
    {},
    { $inc: { orderSequence: 1 } },
    { new: true, upsert: true, session }
  );

  const seq = String(settings!.orderSequence).padStart(5, '0');
  return `RT-${year}-${seq}`;
};