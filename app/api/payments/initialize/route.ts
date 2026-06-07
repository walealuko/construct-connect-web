import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { initializeTransaction, getSubscriptionAmount } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const tier = (session.user as any).tier;

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const amount = getSubscriptionAmount(tier);
    const reference = `tax_${tier}_${userId}_${Date.now()}`;

    const transaction = await initializeTransaction(user.email, amount, reference);

    if (!transaction.data) {
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
    }

    return NextResponse.json({
      authorizationUrl: transaction.data.authorization_url,
      reference,
      amount,
    });

  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}