import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface IDeviceModel extends Document {
  brandId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────
const DeviceModelSchema = new Schema<IDeviceModel>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    seriesId: {
      type: Schema.Types.ObjectId,
      ref: 'Series',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    displayOrder: {
      type: Number,
      default: 0,
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
DeviceModelSchema.index({ seriesId: 1, slug: 1 }, { unique: true });
DeviceModelSchema.index({ brandId: 1, isActive: 1 });
DeviceModelSchema.index({ seriesId: 1, isActive: 1, displayOrder: 1 });

// ── Model ─────────────────────────────────────────
export const DeviceModel = mongoose.model<IDeviceModel>(
  'DeviceModel',
  DeviceModelSchema
);