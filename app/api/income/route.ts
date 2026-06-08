import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Income from '@/models/Income';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');

    await dbConnect();

    let query: any = { userId };
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const incomes = await Income.find(query).sort({ date: -1 });
    return NextResponse.json({ incomes });

  } catch (error: any) {
    console.error('Get incomes error:', error);
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { source, description, amount, date, payerName } = body;

    if (!source || !description || !amount || !date) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const income = new Income({
      userId,
      source,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
      payerName,
    });

    await income.save();

    return NextResponse.json({ income }, { status: 201 });

  } catch (error: any) {
    console.error('Create income error:', error);
    return NextResponse.json({ error: 'Failed to create income entry' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, source, description, amount, date, payerName } = body;

    if (!id) {
      return NextResponse.json({ error: 'Income ID required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const income = await Income.findOne({ _id: id, userId });
    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    if (source) income.source = source;
    if (description) income.description = description;
    if (amount) income.amount = parseFloat(amount);
    if (date) income.date = new Date(date);
    if (payerName !== undefined) income.payerName = payerName;

    await income.save();

    return NextResponse.json({ income });

  } catch (error: any) {
    console.error('Update income error:', error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Income ID required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const income = await Income.findOneAndDelete({ _id: id, userId });
    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Income deleted' });

  } catch (error: any) {
    console.error('Delete income error:', error);
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}
