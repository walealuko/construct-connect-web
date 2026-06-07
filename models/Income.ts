import mongoose, { Document, Schema } from 'mongoose';

export interface IIncome extends Document {
  userId: mongoose.Types.ObjectId;
  source: 'employment' | 'self_employed' | 'business' | 'rental' | 'investments' | 'other';
  description: string;
  amount: number;
  date: Date;
  payerName?: string;
  createdAt: Date;
}

const IncomeSchema = new Schema<IIncome>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  source: {
    type: String,
    enum: ['employment', 'self_employed', 'business', 'rental', 'investments', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  payerName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Income || mongoose.model<IIncome>('Income', IncomeSchema);