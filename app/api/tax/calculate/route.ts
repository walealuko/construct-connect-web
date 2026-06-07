import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Income from '@/models/Income';
import Expense from '@/models/Expense';
import TaxRecord from '@/models/TaxRecord';
import { calculatePAYE } from '@/lib/tax-rules/paye';
import { calculateCIT } from '@/lib/tax-rules/cit';
import { calculateVAT, shouldRegisterVAT } from '@/lib/tax-rules/vat';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { taxType, year, periodStart, periodEnd } = body;

    if (!taxType || !year) {
      return NextResponse.json({ error: 'Tax type and year are required' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const tier = (session.user as any).tier;

    await dbConnect();

    // Get incomes and expenses for the period
    const startDate = periodStart ? new Date(periodStart) : new Date(parseInt(year), 0, 1);
    const endDate = periodEnd ? new Date(periodEnd) : new Date(parseInt(year), 11, 31);

    const incomes = await Income.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    let result: any;

    switch (taxType) {
      case 'paye':
        result = calculatePAYE({ grossIncome: totalIncome });
        break;

      case 'cit':
        result = calculateCIT({
          grossRevenue: totalIncome,
          allowableExpenses: totalExpenses,
          isResident: true,
        });
        break;

      case 'vat':
        const outputVAT = totalIncome * 0.15;
        const inputVAT = totalExpenses * 0.15;
        const isRegistered = shouldRegisterVAT(totalIncome);
        result = calculateVAT({
          outputVAT,
          inputVAT,
          isRegistered,
          filingFrequency: totalIncome >= 25000000 ? 'monthly' : 'quarterly',
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid tax type' }, { status: 400 });
    }

    // Save tax record
    const taxRecord = new TaxRecord({
      userId,
      taxType,
      assessmentYear: parseInt(year),
      periodStart: startDate,
      periodEnd: endDate,
      totalIncome,
      totalExpenses,
      taxableIncome: result.taxableIncome ?? result.totalAssessableIncome ?? totalIncome - totalExpenses,
      taxLiability: result.taxLiability,
      status: 'draft',
      breakdown: result.breakdown,
    });

    await taxRecord.save();

    return NextResponse.json({
      taxRecord: {
        id: taxRecord._id.toString(),
        taxType,
        assessmentYear: year,
        totalIncome,
        totalExpenses,
        taxableIncome: result.taxableIncome ?? result.totalAssessableIncome ?? totalIncome - totalExpenses,
        taxLiability: result.taxLiability,
        breakdown: result.breakdown,
        effectiveRate: result.effectiveRate,
        isSmallCompany: result.isSmallCompany,
        isRefund: result.isRefund,
      },
    });

  } catch (error: any) {
    console.error('Tax calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate tax' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const taxType = searchParams.get('taxType');
    const year = searchParams.get('year');

    await dbConnect();

    let query: any = { userId };
    if (taxType) query.taxType = taxType;
    if (year) query.assessmentYear = parseInt(year);

    const records = await TaxRecord.find(query).sort({ assessmentYear: -1, createdAt: -1 });

    return NextResponse.json({ records });

  } catch (error: any) {
    console.error('Get tax records error:', error);
    return NextResponse.json({ error: 'Failed to fetch tax records' }, { status: 500 });
  }
}