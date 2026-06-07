/**
 * Nigerian PAYE (Personal Income Tax) Calculator
 * Based on Personal Income Tax Act (PITA) 2011 (as amended)
 *
 * Tax Brackets (Annual):
 * - First ₦300,000: 7%
 * - ₦300,001 - ₦600,000: 11%
 * - ₦600,001 - ₦1,100,000: 15%
 * - ₦1,100,001 - ₦1,600,000: 18%
 * - ₦1,600,001 - ₦3,200,000: 21%
 * - Above ₦3,200,000: 24%
 *
 * Consolidated Relief Allowance (CRA): ₦1,000,000 + 20% of gross income
 */

export interface PAYEInput {
  grossIncome: number;
  pensionContribution?: number;
  lifeAssurance?: number;
  voluntaryContribution?: number;
}

export interface PAYEResult {
  grossIncome: number;
  consolidatedReliefAllowance: number;
  taxableIncome: number;
  taxLiability: number;
  effectiveRate: number;
  breakdown: Array<{ bracket: string; rate: number; amount: number; tax: number }>;
}

export function calculatePAYE(input: PAYEInput): PAYEResult {
  const gross = input.grossIncome;

  // Consolidated Relief Allowance: ₦1,000,000 + 20% of gross income
  const cra = Math.min(1000000 + (gross * 0.2), gross);

  // Taxable income after CRA
  const taxableIncome = Math.max(0, gross - cra);

  // Calculate tax using brackets
  const brackets = [
    { min: 0, max: 300000, rate: 0.07, label: 'First ₦300,000' },
    { min: 300000, max: 600000, rate: 0.11, label: '₦300,001 - ₦600,000' },
    { min: 600000, max: 1100000, rate: 0.15, label: '₦600,001 - ₦1,100,000' },
    { min: 1100000, max: 1600000, rate: 0.18, label: '₦1,100,001 - ₦1,600,000' },
    { min: 1600000, max: 3200000, rate: 0.21, label: '₦1,600,001 - ₦3,200,000' },
    { min: 3200000, max: Infinity, rate: 0.24, label: 'Above ₦3,200,000' },
  ];

  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const breakdown: PAYEResult['breakdown'] = [];

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketSize = bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min;
    const incomeInBracket = Math.min(remainingIncome, bracketSize);

    if (incomeInBracket > 0) {
      const taxInBracket = incomeInBracket * bracket.rate;
      totalTax += taxInBracket;

      breakdown.push({
        bracket: bracket.label,
        rate: bracket.rate * 100,
        amount: incomeInBracket,
        tax: taxInBracket,
      });

      remainingIncome -= incomeInBracket;
    }
  }

  const effectiveRate = taxableIncome > 0 ? (totalTax / gross) * 100 : 0;

  return {
    grossIncome: gross,
    consolidatedReliefAllowance: cra,
    taxableIncome,
    taxLiability: Math.round(totalTax),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

// Monthly PAYE calculation
export function calculateMonthlyPAYE(annualGross: number): PAYEResult {
  const annualResult = calculatePAYE({ grossIncome: annualGross });
  return {
    ...annualResult,
    grossIncome: annualGross / 12,
    consolidatedReliefAllowance: annualResult.consolidatedReliefAllowance / 12,
    taxableIncome: annualResult.taxableIncome / 12,
    taxLiability: Math.round(annualResult.taxLiability / 12),
    breakdown: annualResult.breakdown.map(b => ({
      ...b,
      amount: b.amount / 12,
      tax: b.tax / 12,
    })),
  };
}