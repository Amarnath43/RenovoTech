import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface IBrand extends Document {
  name: string;
  slug: string;
  logo: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────
const BrandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    logo: {
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
BrandSchema.index({ slug: 1 });
BrandSchema.index({ isActive: 1, displayOrder: 1 });

// ── Model ─────────────────────────────────────────
export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);