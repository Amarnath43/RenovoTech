import { asyncHandler } from '../utils/asyncHandler.js';
import { createError }  from '../utils/errorHandler.js';
import {
  getAvailableDates,
  getAvailableSlots,
} from '../services/slot.service.js';

//Get Available Dates
export const getDates = asyncHandler(async (req, res) => {
  const dates = await getAvailableDates();
  res.json({ success: true, dates });
});

//Get Available Slots for a Date 
export const getSlots = asyncHandler(async (req, res) => {
  const date = req.params.date as string;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError('Invalid date format. Use YYYY-MM-DD', 400);
  }

  const slots = await getAvailableSlots(date);
  res.json({ success: true, date, slots });
});