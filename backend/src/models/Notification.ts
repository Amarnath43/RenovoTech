import mongoose, { Schema, Document } from 'mongoose';

// ── Types ─────────────────────────────────────────
export type NotificationType   = 'whatsapp' | 'email';
export type NotificationStatus = 'sent' | 'failed' | 'pending';
export type NotificationEvent  =
  | 'booking_confirmed'
  | 'pickup_scheduled'
  | 'device_picked_up'
  | 'estimate_sent'
  | 'repair_completed'
  | 'out_for_delivery'
  | 'completed';

// ── Interface ─────────────────────────────────────
export interface INotification extends Document {
  orderId:   mongoose.Types.ObjectId;
  userId:    mongoose.Types.ObjectId;
  type:      NotificationType;
  event:     NotificationEvent;
  recipient: string;
  message:   string;
  status:    NotificationStatus;
  retries:   number;
  error?:    string;
  sentAt?:   Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────
const NotificationSchema = new Schema<INotification>(
  {
    orderId: {
      type:     Schema.Types.ObjectId,
      ref:      'Order',
      required: true,
      index:    true,
    },
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    type: {
      type:     String,
      enum:     ['whatsapp', 'email'],
      required: true,
    },
    event: {
      type:     String,
      enum:     [
        'booking_confirmed',
        'pickup_scheduled',
        'device_picked_up',
        'estimate_sent',
        'repair_completed',
        'out_for_delivery',
        'completed',
      ],
      required: true,
    },
    recipient: {
      type:     String,
      required: true,
      trim:     true,
    },
    message: {
      type:     String,
      required: true,
    },
    status: {
      type:    String,
      enum:    ['sent', 'failed', 'pending'],
      default: 'pending',
    },
    retries: {
      type:    Number,
      default: 0,
    },
    error: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────
NotificationSchema.index({ orderId: 1 });
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ event: 1, status: 1 });

// ── Model ─────────────────────────────────────────
export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);