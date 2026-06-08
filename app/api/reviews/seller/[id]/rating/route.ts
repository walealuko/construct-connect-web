import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const stats = await Review.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = stats[0] || { average: 0, count: 0 };

    return NextResponse.json({
      average: result.average || 0,
      count: result.count || 0,
    });
  } catch (error) {
    console.error('Error fetching rating summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
