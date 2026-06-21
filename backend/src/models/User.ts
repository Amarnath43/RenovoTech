import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface IUser extends Document {
  phone:             string;
  name:              string;
  role:              'customer' | 'technician' | 'admin';
  isProfileComplete: boolean;
  isActive:          boolean;
  lastLoginAt?:      Date;
  createdAt:         Date;
  updatedAt:         Date;
}

// ── Schema ────────────────────────────────────────
const UserSchema = new Schema<IUser>(
  {
    phone: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    name: {
      type:    String,
      default: '',
      trim:    true,
    },
    role: {
      type:    String,
      enum:    ['customer', 'technician', 'admin'],
      default: 'customer',
    },
    isProfileComplete: {
      type:    Boolean,
      default: false,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────
UserSchema.index({ name: 1 });
UserSchema.index({ role: 1, createdAt: -1 });

// ── Model ─────────────────────────────────────────
export const User = mongoose.model<IUser>('User', UserSchema);