import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  sellerId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Create a compound index to ensure a buyer can only review a seller once
ReviewSchema.index({ sellerId: 1, reviewerId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
