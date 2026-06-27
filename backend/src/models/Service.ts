import mongoose, { Schema, Document } from 'mongoose';

// ── Symptom Interface ─────────────────────────────
export interface ISymptom {
  label:       string;
  isActive:    boolean;
}

// ── Interface ─────────────────────────────────────
export interface IService extends Document {
  name:       string;
  slug:       string;
  image:      string;
  repairTime: number;   
  warranty:   number;   
  symptoms:   ISymptom[];
  isActive:   boolean;
  createdAt:  Date;
  updatedAt:  Date;
}

// ── Schema ────────────────────────────────────────
const ServiceSchema = new Schema<IService>(
  {
    name: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    slug: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    image: {
      type:    String,
      default: '',
    },
    repairTime: {
      type:    Number,
      default: 60,      // ← 60 minutes
      min:     0,
    },
    warranty: {
      type:    Number,
      default: 90,      // ← 90 days
      min:     0,
    },
    symptoms: [
      {
        label: {
          type:     String,
          required: true,
          trim:     true,
        },
        isActive: {
          type:    Boolean,
          default: true,
        },
      },
    ],
    isActive: {
      type:    Boolean,
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