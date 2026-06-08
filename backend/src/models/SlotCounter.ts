import mongoose, { Schema, Document } from 'mongoose';

export interface ISlotCounter extends Document {
  date:  Date;
  slot:  string;
  count: number;
}

const SlotCounterSchema = new Schema<ISlotCounter>({
  date:  { type: Date,   required: true },
  slot:  { type: String, required: true },
  count: { type: Number, default: 0 },
});

SlotCounterSchema.index({ date: 1, slot: 1 }, { unique: true });

export const SlotCounter = mongoose.model<ISlotCounter>('SlotCounter', SlotCounterSchema);