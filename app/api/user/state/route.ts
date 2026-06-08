import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { state } = await req.json();

    if (!state) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 });
    }

    await dbConnect();

    const userId = (session.user as any).id;
    await User.findByIdAndUpdate(userId, { state });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
