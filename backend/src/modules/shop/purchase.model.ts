import { Schema, model, type Types } from 'mongoose';

export interface IPurchase {
  userId: Types.ObjectId;
  // Chosen by the client for each "Buy" press; a retry with the same key never pays twice.
  clientKey: string;
  packageId: string;
  coins: number;
  priceCents: number;
  status: 'pending' | 'completed';
  balanceAfter?: number;
  createdAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientKey: { type: String, required: true },
    packageId: { type: String, required: true },
    coins: { type: Number, required: true },
    priceCents: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    balanceAfter: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
purchaseSchema.index({ userId: 1, clientKey: 1 }, { unique: true });
purchaseSchema.index({ userId: 1, createdAt: -1 });

export const Purchase = model<IPurchase>('Purchase', purchaseSchema);
