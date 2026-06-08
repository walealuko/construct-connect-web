import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');

    await dbConnect();

    let query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (year && !isNaN(parseInt(year))) {
      const startYear = parseInt(year);
      const startDate = new Date(startYear, 0, 1);
      const endDate = new Date(startYear, 11, 31, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    return NextResponse.json({ expenses });

  } catch (error: any) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses: ' + error.message }, { status: 500 });
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
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    await dbConnect();

    const expense = new Expense({
      userId: new mongoose.Types.ObjectId(userId),
      category,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
    });

    await expense.save();

    return NextResponse.json({ expense }, { status: 201 });

  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense entry: ' + error.message }, { status: 500 });
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
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    await dbConnect();

    const expense = await Expense.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

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
    return NextResponse.json({ error: 'Failed to update expense: ' + error.message }, { status: 500 });
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
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    await dbConnect();

    const expense = await Expense.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Expense deleted' });

  } catch (error: any) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense: ' + error.message }, { status: 500 });
  }
}
