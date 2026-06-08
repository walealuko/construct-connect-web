import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/paystack';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    const response = await verifyTransaction(reference);

    if (!response.data) {
      return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 400 });
    }

    if (response.data.status === 'success') {
      await dbConnect();

      // Update user subscription status
      const user = await User.findOne({ email: response.data.customer.email });
      if (user) {
        user.subscriptionStatus = 'active';
        user.subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        await user.save();
      }

      return NextResponse.json({ success: true, message: 'Subscription activated' });
    }

    return NextResponse.json({ success: false, message: 'Payment not successful' });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
