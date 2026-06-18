import { asyncHandler } from '../utils/asyncHandler.js';
import { createError }  from '../utils/errorHandler.js';
import { User }         from '../models/User.js';


export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) throw createError('Not authenticated', 401);

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw createError('Name must be at least 2 characters', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);

  user.name              = name.trim();
  user.isProfileComplete = true;
  await user.save();

  res.json({
    success: true,
    message: 'Profile updated',
    user: {
      id:                user._id,
      phone:             user.phone,
      name:              user.name,
      role:              user.role,
      isProfileComplete: user.isProfileComplete,
    },
  });
});