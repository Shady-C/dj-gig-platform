import mongoose, { Schema, Document } from 'mongoose';

export interface ITip extends Document {
  eventId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  paymentMethodType?: string;
  netAmount?: number;
  stripeFee?: number;
  tipperName?: string;
  message?: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const TipSchema = new Schema<ITip>(
  {
    eventId:               { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    amount:                { type: Number, required: true },
    currency:              { type: String, default: 'cad' },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    stripeChargeId:        { type: String, default: '' },
    paymentMethodType:     { type: String, default: '' },
    netAmount:             { type: Number },
    stripeFee:             { type: Number },
    tipperName:            { type: String, default: '' },
    message:               { type: String, default: '' },
    status:                { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model<ITip>('Tip', TipSchema);
