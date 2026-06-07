/**
 * Nigerian Company Income Tax (CIT) Calculator
 * Based on Companies Income Tax Act (CITA) Cap C21 LFN 2004 (as amended)
 *
 * Standard Rate: 30%
 * Small Companies Rate: 25% (if turnover <= ₦25M AND paid-up capital <= ₦100M)
 */

export interface CITInput {
  grossRevenue: number;
  allowableExpenses: number;
  paidUpCapital?: number; // for small company eligibility
  isResident: boolean;
}

export interface CITResult {
  grossRevenue: number;
  allowableExpenses: number;
  totalAssessableIncome: number;
  taxRate: number;
  taxLiability: number;
  isSmallCompany: boolean;
  effectiveRate: number;
  breakdown: {
    description: string;
    amount: number;
  }[];
}

export function calculateCIT(input: CITInput): CITResult {
  const { grossRevenue, allowableExpenses, paidUpCapital = 0, isResident = true } = input;

  // Assessable income = Gross Revenue - Allowable Expenses
  const totalAssessableIncome = Math.max(0, grossRevenue - allowableExpenses);

  // Determine tax rate based on company size
  // Small company: turnover <= ₦25M AND paid-up capital <= ₦100M
  const isSmallCompany =
    grossRevenue <= 25000000 && paidUpCapital <= 100000000;

  const taxRate = isSmallCompany ? 0.25 : 0.30;
  const taxLiability = totalAssessableIncome * taxRate;
  const effectiveRate = grossRevenue > 0 ? (taxLiability / grossRevenue) * 100 : 0;

  const breakdown = [
    { description: 'Gross Revenue', amount: grossRevenue },
    { description: 'Less: Allowable Expenses', amount: -allowableExpenses },
    { description: 'Total Assessable Income', amount: totalAssessableIncome },
    { description: `CIT Rate (${(taxRate * 100).toFixed(0)}%)`, amount: 0 },
    { description: 'Tax Liability', amount: taxLiability },
  ];

  return {
    grossRevenue,
    allowableExpenses,
    totalAssessableIncome,
    taxRate,
    taxLiability: Math.round(taxLiability),
    isSmallCompany,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

// Calculate quarterly estimated tax for companies
export function calculateQuarterlyCIT(annualEstimate: CITInput): CITResult {
  const annual = calculateCIT(annualEstimate);
  return {
    ...annual,
    grossRevenue: annual.grossRevenue / 4,
    allowableExpenses: annual.allowableExpenses / 4,
    totalAssessableIncome: annual.totalAssessableIncome / 4,
    taxLiability: Math.round(annual.taxLiability / 4),
    breakdown: annual.breakdown.map(item => ({
      ...item,
      amount: item.amount / 4,
    })),
  };
}