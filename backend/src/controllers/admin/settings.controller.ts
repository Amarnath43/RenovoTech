import { Settings } from '../../models/Settings.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createError }  from '../../utils/errorHandler.js';

// ── Get Settings ──────────────────────────────────
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne().select('-__v');
  if (!settings) throw createError('Settings not configured', 404);
  res.json({ success: true, settings });
});

// ── Update Settings ───────────────────────────────
export const updateSettings = asyncHandler(async (req, res) => {
  const allowed = [
    'storeVisitEnabled', 'pickupDropEnabled', 'pickupSlotDurationMins',
    'maxPickupsPerSlot', 'minLeadTimeMinutes', 'workingHoursStart',
    'workingHoursEnd', 'calendarDays', 'workingDays',
    'bookingFee', 'bookingFeeEnabled',
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw createError('No valid settings fields provided', 400);
  }

  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, runValidators: true },
  ).select('-__v');

  if (!settings) throw createError('Settings not configured', 404);

  res.json({ success: true, message: 'Settings updated', settings });
});