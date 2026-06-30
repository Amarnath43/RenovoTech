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

  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: req.body },
    { new: true, upsert:true, runValidators: true },
  ).select('-__v');

  if (!settings) throw createError('Settings not configured', 404);

  res.json({ success: true, message: 'Settings updated', settings });
});