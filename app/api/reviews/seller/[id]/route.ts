import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import User from '@/models/User';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const reviews = await Review.find({ sellerId: id })
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'firstName lastName');

    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewerName: `${review.reviewerId?.firstName || ''} ${review.reviewerId?.lastName || ''}`.trim() || 'Anonymous',
    }));

    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
