import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Review from '@/models/Review';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sellerId, rating, comment } = await req.json();

    if (!sellerId || !rating) {
      return NextResponse.json({ error: 'Seller ID and rating are required' }, { status: 400 });
    }

    await dbConnect();

    const userId = (session.user as any).id;

    // Validate user is a buyer (individual tier)
    const user = await User.findById(userId);
    if (!user || user.tier !== 'individual') {
      return NextResponse.json({ error: 'Only buyers can leave reviews' }, { status: 403 });
    }

    // Check if seller exists and is actually a seller
    const seller = await User.findById(sellerId);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Prevent duplicate reviews
    const existingReview = await Review.findOne({ sellerId, reviewerId: userId });
    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this seller' }, { status: 400 });
    }

    const newReview = await Review.create({
      sellerId,
      reviewerId: userId,
      rating,
      comment,
    });

    return NextResponse.json({ success: true, review: newReview }, { status: 201 });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
