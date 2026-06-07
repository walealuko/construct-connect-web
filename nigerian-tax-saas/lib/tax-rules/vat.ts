/**
 * Nigerian VAT (Value Added Tax) Calculator
 * Based on Value Added Tax Act Cap V1 LFN 2004 (as amended)
 *
 * Standard Rate: 15%
 * Registration Threshold: ₦25M annual turnover
 * File: Monthly (if turnover >= ₦25M) or Quarterly (for smaller registered businesses)
 */

export interface VATInput {
  outputVAT: number;      // VAT collected on sales
  inputVAT: number;       // VAT paid on purchases/expenses
  isRegistered: boolean; // Whether business is VAT registered
  filingFrequency: 'monthly' | 'quarterly';
}

export interface VATResult {
  outputVAT: number;
  inputVAT: number;
  netVATPayable: number;
  isRefund: boolean;
  filingFrequency: 'monthly' | 'quarterly';
  effectiveRate: number;
  breakdown: {
    description: string;
    amount: number;
  }[];
}

export function calculateVAT(input: VATInput): VATResult {
  const { outputVAT, inputVAT, isRegistered, filingFrequency } = input;

  // Net VAT = Output VAT - Input VAT
  const netVATPayable = outputVAT - inputVAT;
  const isRefund = netVATPayable < 0;

  // Effective rate based on output VAT vs gross revenue (assumed ratio for estimation)
  // This would be calculated from actual revenue in real usage
  const effectiveRate = 15; // VAT rate is standard 15%

  const breakdown = [
    { description: 'Output VAT (VAT on Sales)', amount: outputVAT },
    { description: 'Less: Input VAT (VAT on Purchases)', amount: -inputVAT },
    { description: 'Net VAT Payable / (Refund)', amount: netVATPayable },
    { description: 'Filing Frequency', amount: filingFrequency === 'monthly' ? 1 : 0.25 },
  ];

  return {
    outputVAT,
    inputVAT,
    netVATPayable: Math.round(netVATPayable),
    isRefund,
    filingFrequency,
    effectiveRate,
    breakdown,
  };
}

// Calculate VAT from revenue (when output VAT not explicitly tracked)
export function calculateVATFromRevenue(revenue: number, inputVATPaid: number = 0): VATResult {
  const outputVAT = revenue * 0.15;
  return calculateVAT({
    outputVAT,
    inputVAT: inputVATPaid,
    isRegistered: revenue >= 25000000,
    filingFrequency: revenue >= 25000000 ? 'monthly' : 'quarterly',
  });
}

// Check if business should be VAT registered
export function shouldRegisterVAT(annualTurnover: number): boolean {
  return annualTurnover >= 25000000;
}

// Calculate output VAT amount
export function calculateOutputVAT(salesAmount: number): number {
  return salesAmount * 0.15;
}

// Calculate input VAT amount
export function calculateInputVAT(purchaseAmount: number): number {
  return purchaseAmount * 0.15;
}