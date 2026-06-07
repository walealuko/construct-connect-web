import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  tier: 'individual' | 'business';
  businessType?: 'sole_proprietor' | 'company' | 'partnership';
  businessName?: string;
  cacRegNumber?: string;
  state?: string;
  lga?: string;
  address?: string;
  subscriptionStatus: 'active' | 'expired' | 'cancelled';
  subscriptionExpiry?: Date;
  paystackCustomerCode?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  tier: { type: String, enum: ['individual', 'business'], required: true },
  businessType: { type: String, enum: ['sole_proprietor', 'company', 'partnership'] },
  businessName: { type: String },
  cacRegNumber: { type: String },
  state: { type: String },
  lga: { type: String },
  address: { type: String },
  subscriptionStatus: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'expired' },
  subscriptionExpiry: { type: Date },
  paystackCustomerCode: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);