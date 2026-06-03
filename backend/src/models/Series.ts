import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface ISeries extends Document {
  brandId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────
const SeriesSchema = new Schema<ISeries>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
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
SeriesSchema.index({ brandId: 1, slug: 1 }, { unique: true });
SeriesSchema.index({ brandId: 1, isActive: 1, displayOrder: 1 });

// ── Model ─────────────────────────────────────────
export const Series = mongoose.model<ISeries>('Series', SeriesSchema);