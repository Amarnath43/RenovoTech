import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  role: 'customer' | 'technician' | 'admin';
  isProfileComplete: boolean;
  isActive: boolean;
  savedAddresses: {
    label: string;
    address: string;
    area: string;
    pincode: string;
  }[];
  createdAt: Date;
  lastLoginAt: Date;
}


const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: ['customer', 'technician', 'admin'],
      default: 'customer',
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    savedAddresses: [
      {
        label:   { type: String },
        address: { type: String },
        area:    { type: String },
        pincode: { type: String },
      },
    ],
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);