import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  category: 'salaries' | 'rent' | 'utilities' | 'transport' | 'inventory' | 'marketing' | 'professional_services' | 'other';
  description: string;
  amount: number;
  date: Date;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['salaries', 'rent', 'utilities', 'transport', 'inventory', 'marketing', 'professional_services', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);