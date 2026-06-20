import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface ISettings extends Document {
  // ── Service Types ────────────────────────────
  storeVisitEnabled: boolean;
  pickupDropEnabled: boolean;
  // ── Pickup Slots ─────────────────────────────
  pickupSlotDurationMins: number;
  maxPickupsPerSlot: number;
  minLeadTimeMinutes: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  calendarDays: number;
  workingDays: string[];
  // ── Payment ──────────────────────────────────
  bookingFee: number;
  bookingFeeEnabled: boolean;
  // ── Slot Hold ────────────────────────────────
  createdAt: Date;
  updatedAt: Date;

  orderSequence: number;
}

// ── Schema ────────────────────────────────────────
const SettingsSchema = new Schema<ISettings>(
  {
    // ── Service Types ────────────────────────────
    storeVisitEnabled: {
      type: Boolean,
      default: false,       // ← disabled until store is ready
    },
    pickupDropEnabled: {
      type: Boolean,
      default: true,        // ← enabled from day one
    },
    // ── Pickup Slots ─────────────────────────────
    pickupSlotDurationMins: {
      type: Number,
      default: 60,          // ← 1 hour slots
    },
    maxPickupsPerSlot: {
      type: Number,
      default: 5,           // ← 5 pickups per slot
    },
    minLeadTimeMinutes: {          // ← NEW
      type: Number,
      default: 60,
    },
    workingHoursStart: {
      type: String,
      default: '09:00',     // ← 9:00 AM
    },
    workingHoursEnd: {
      type: String,
      default: '19:00',     // ← 7:00 PM
    },
    calendarDays: {
      type: Number,
      default: 15,          // ← 15 days calendar
    },
    workingDays: {
      type: [String],
      default: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ],
    },
    // ── Payment ──────────────────────────────────
    bookingFee: {
      type: Number,
      default: 99,          // ← ₹99 booking fee
    },
    bookingFeeEnabled: {
      type: Boolean,
      default: true,        // ← fee enabled
    },
    orderSequence: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ── Model ─────────────────────────────────────────
export const Settings = mongoose.model<ISettings>(
  'Settings',
  SettingsSchema
);