import mongoose, { Schema, Document } from 'mongoose';

// ── Status Types ──────────────────────────────────
export type OrderStatus =
  | 'booked'
  | 'pickup_scheduled'
  | 'device_picked_up'
  | 'device_received'
  | 'technician_assigned'
  | 'diagnosis_in_progress'
  | 'estimate_sent'
  | 'customer_approved'
  | 'customer_rejected'
  | 'repair_in_progress'
  | 'quality_check'
  | 'ready_for_drop'
  | 'out_for_delivery'
  | 'completed';

export type CustomerApproval = 'pending' | 'approved' | 'rejected';
export type PaymentStatus    = 'pending' | 'partial'  | 'paid';
export type Priority         = 'normal'  | 'urgent'   | 'vip';

// ── Address Interface ─────────────────────────────
export interface IAddress {
  flatOrHouse: string;
  area:        string;
  city:        string;
  state:       string;
  pincode:     string;
  fullAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// ── Status History Interface ──────────────────────
export interface IStatusHistory {
  status:    OrderStatus;
  updatedBy: mongoose.Types.ObjectId;
  note:      string;
  timestamp: Date;
}

// ── Order Service Interface ───────────────────────
export interface IOrderService {
  serviceId:        mongoose.Types.ObjectId;
  serviceName:      string;
  price:            number;
  selectedSymptoms: string[];
}

// ── Main Interface ────────────────────────────────
export interface IOrder extends Document {
  orderId:          string;
  customerId:       mongoose.Types.ObjectId;
  technicianId?:    mongoose.Types.ObjectId;
  // Device
  brandId:          mongoose.Types.ObjectId;
  seriesId:         mongoose.Types.ObjectId;
  modelId:          mongoose.Types.ObjectId;
  modelName:        string;
  // Services
  services:         IOrderService[];
  // Pickup Details
  pickupAddress:    IAddress;
  contactName:      string;
  contactPhone:     string;
  pickupDate:       Date;
  pickupSlot:       string;
  // Status
  status:           OrderStatus;
  priority:         Priority;
  statusHistory:    IStatusHistory[];
  // Technician
  diagnosisNotes?:  string;
  beforePhotos:     string[];
  afterPhotos:      string[];
  estimateSentAt?:  Date;
  customerApproval: CustomerApproval;
  // Financial
  estimatedAmount:  number;
  finalAmount?:     number;
  bookingFee:       number;
  paymentStatus:    PaymentStatus;
  // Admin
  adminNotes?:      string;
  createdAt:        Date;
  updatedAt:        Date;
}

// ── Address Schema ────────────────────────────────
const AddressSchema = new Schema<IAddress>(
  {
    flatOrHouse: { type: String, required: true, trim: true },
    area:        { type: String, required: true, trim: true },
    city:        { type: String, required: true, trim: true },
    state:       { type: String, required: true, trim: true },
    pincode:     { type: String, required: true, trim: true },
    fullAddress: { type: String, trim: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: false }
);

// ── Status History Schema ─────────────────────────
const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status:    { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note:      { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Order Service Schema ──────────────────────────
const OrderServiceSchema = new Schema<IOrderService>(
  {
    serviceId:        { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceName:      { type: String, required: true },
    price:            { type: Number, required: true },
    selectedSymptoms: { type: [String], default: [] },
  },
  { _id: false }
);

// ── Main Order Schema ─────────────────────────────
const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type:     String,
      unique:   true,
      required: true,
    },
    customerId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref:  'User',
    },
    // ── Device ──────────────────────────────────
    brandId: {
      type:     Schema.Types.ObjectId,
      ref:      'Brand',
      required: true,
    },
    seriesId: {
      type:     Schema.Types.ObjectId,
      ref:      'Series',
      required: true,
    },
    modelId: {
      type:     Schema.Types.ObjectId,
      ref:      'DeviceModel',
      required: true,
    },
    modelName: {
      type:     String,
      required: true,
    },
    // ── Services ────────────────────────────────
    services: {
      type:     [OrderServiceSchema],
      required: true,
    },
    // ── Pickup Details ───────────────────────────
    pickupAddress: {
      type:     AddressSchema,
      required: true,
    },
    contactName: {
      type:     String,
      required: true,
      trim:     true,
    },
    contactPhone: {
      type:     String,
      required: true,
      trim:     true,
    },
    pickupDate: {
      type:     Date,
      required: true,
    },
    pickupSlot: {
      type:     String,
      required: true,
    },
    // ── Status ──────────────────────────────────
    status: {
      type:    String,
      enum:    [
        'booked',
        'pickup_scheduled',
        'device_picked_up',
        'device_received',
        'technician_assigned',
        'diagnosis_in_progress',
        'estimate_sent',
        'customer_approved',
        'customer_rejected',
        'repair_in_progress',
        'quality_check',
        'ready_for_drop',
        'out_for_delivery',
        'completed',
      ],
      default: 'booked',
      index:   true,
    },
    priority: {
      type:    String,
      enum:    ['normal', 'urgent', 'vip'],
      default: 'normal',
    },
    statusHistory: {
      type:    [StatusHistorySchema],
      default: [],
    },
    // ── Technician ───────────────────────────────
    diagnosisNotes: {
      type: String,
      trim: true,
    },
    beforePhotos: {
      type:    [String],
      default: [],
    },
    afterPhotos: {
      type:    [String],
      default: [],
    },
    estimateSentAt: {
      type: Date,
    },
    customerApproval: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // ── Financial ────────────────────────────────
    estimatedAmount: {
      type:    Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
    },
    bookingFee: {
      type:    Number,
      default: 0,       // ← set from Settings in controller
    },
    paymentStatus: {
      type:    String,
      enum:    ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    // ── Admin ────────────────────────────────────
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ technicianId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ pickupDate: 1, pickupSlot: 1, status: 1 });
OrderSchema.index({ 'pickupAddress.pincode': 1 });

// ── Model ─────────────────────────────────────────
export const Order = mongoose.model<IOrder>('Order', OrderSchema);