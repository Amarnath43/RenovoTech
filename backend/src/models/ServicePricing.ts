import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface IServicePricing extends Document {
  modelId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  price: number;
  discountedPrice?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────
const ServicePricingSchema = new Schema<IServicePricing>(
  {
    modelId: {
      type: Schema.Types.ObjectId,
      ref: 'DeviceModel',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────
ServicePricingSchema.index({ modelId: 1, serviceId: 1 }, { unique: true });
ServicePricingSchema.index({ modelId: 1, isActive: 1 });

// ── Model ─────────────────────────────────────────
export const ServicePricing = mongoose.model<IServicePricing>(
  'ServicePricing',
  ServicePricingSchema
);