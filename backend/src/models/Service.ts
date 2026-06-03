import mongoose, { Schema, Document } from 'mongoose';

// ── Symptom Interface ─────────────────────────────
export interface ISymptom {
  label: string;
  description: string;
  isActive: boolean;
}

// ── Interface ─────────────────────────────────────
export interface IService extends Document {
  name: string;
  slug: string;
  icon: string;
  description: string;
  estimatedTime: string;
  warranty: string;
  symptoms: ISymptom[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────
const ServiceSchema = new Schema<IService>(
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
    icon: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    estimatedTime: {
      type: String,
      default: '',
    },
    warranty: {
      type: String,
      default: '',
    },
    symptoms: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          default: '',
          trim: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
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
ServiceSchema.index({ slug: 1 });
ServiceSchema.index({ isActive: 1 });

// ── Model ─────────────────────────────────────────
export const Service = mongoose.model<IService>('Service', ServiceSchema);