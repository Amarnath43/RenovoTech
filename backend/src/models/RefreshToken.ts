import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ─────────────────────────────────────
export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  deviceInfo: string;
  ipAddress: string;
  expiresAt: Date;
  lastUsedAt: Date;
  createdAt: Date;
}

// ── Schema ────────────────────────────────────────
const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: String,
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },         // TTL auto delete
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,             // set on creation, updated on each use
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────
RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });
RefreshTokenSchema.index({ lastUsedAt: 1 });  // for inactive session cleanup

// ── Model ─────────────────────────────────────────
export const RefreshToken = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema
);