import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';

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

    const expenses = await Expense.find(query).sort({ date: -1 });
    return NextResponse.json({ expenses });

  } catch (error: any) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category, description, amount, date } = body;

    if (!category || !description || !amount || !date) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const expense = new Expense({
      userId,
      category,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
    });

    await expense.save();

    return NextResponse.json({ expense }, { status: 201 });

  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense entry' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, category, description, amount, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const expense = await Expense.findOne({ _id: id, userId });
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (category) expense.category = category;
    if (description) expense.description = description;
    if (amount) expense.amount = parseFloat(amount);
    if (date) expense.date = new Date(date);

    await expense.save();

    return NextResponse.json({ expense });

  } catch (error: any) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
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
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const expense = await Expense.findOneAndDelete({ _id: id, userId });
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Expense deleted' });

  } catch (error: any) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
