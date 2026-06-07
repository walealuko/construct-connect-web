import mongoose, { Document, Schema } from 'mongoose';

export interface ITaxRecord extends Document {
  userId: mongoose.Types.ObjectId;
  taxType: 'paye' | 'cit' | 'vat' | 'wht' | 'cgt';
  assessmentYear: number;
  periodStart?: Date;
  periodEnd?: Date;
  totalIncome: number;
  totalExpenses: number;
  taxableIncome: number;
  taxLiability: number;
  status: 'draft' | 'finalized' | 'submitted';
  breakdown: Record<string, number>;
  pdfUrl?: string;
  createdAt: Date;
}

const TaxRecordSchema = new Schema<ITaxRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  taxType: { type: String, enum: ['paye', 'cit', 'vat', 'wht', 'cgt'], required: true },
  assessmentYear: { type: Number, required: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  totalIncome: { type: Number, required: true },
  totalExpenses: { type: Number, default: 0 },
  taxableIncome: { type: Number, required: true },
  taxLiability: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'finalized', 'submitted'], default: 'draft' },
  breakdown: { type: Schema.Types.Mixed, default: {} },
  pdfUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.TaxRecord || mongoose.model<ITaxRecord>('TaxRecord', TaxRecordSchema);