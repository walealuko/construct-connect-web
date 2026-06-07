'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TaxResult {
  id: string;
  taxType: string;
  assessmentYear: number;
  totalIncome: number;
  totalExpenses: number;
  taxableIncome: number;
  taxLiability: number;
  effectiveRate: number;
  breakdown: Array<{ bracket?: string; description?: string; rate?: number; amount: number; tax?: number }>;
  isSmallCompany?: boolean;
  isRefund?: boolean;
}

export default function IndividualTaxPage() {
  const { data: session } = useSession();
  const [taxType, setTaxType] = useState<'paye' | 'cit' | 'vat'>('paye');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tier = (session?.user as any)?.tier || 'individual';

  const handleCalculate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxType, year }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Calculation failed');
      } else {
        setResult(data.taxRecord);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tax Calculator</h1>
        <p className="text-gray-600">Calculate your tax liability based on your income and expenses</p>
      </div>

      {/* Calculator Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-lg mb-4">Select Tax Type & Year</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value as 'paye' | 'cit' | 'vat')}
              className="w-full"
            >
              <option value="paye">PAYE (Personal Income Tax)</option>
              <option value="cit">Company Income Tax (CIT)</option>
              <option value="vat">Value Added Tax (VAT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full"
            >
              {[2024, 2023, 2022].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Tax'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 uppercase">{result.taxType} Calculation</h2>
              <p className="text-gray-500">Assessment Year {result.assessmentYear}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-700">₦{result.taxLiability.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Tax Liability</div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Total Income</div>
              <div className="text-xl font-semibold">₦{result.totalIncome.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Total Expenses</div>
              <div className="text-xl font-semibold">₦{result.totalExpenses.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Effective Rate</div>
              <div className="text-xl font-semibold">{result.effectiveRate}%</div>
            </div>
          </div>

          {/* Breakdown */}
          {result.breakdown && result.breakdown.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Calculation Breakdown</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-3">{item.bracket || item.description || 'N/A'}</td>
                      <td className="py-3 text-right text-gray-600">
                        {item.rate ? `${item.rate}%` : '-'}
                      </td>
                      <td className="py-3 text-right">
                        {item.amount ? `₦${item.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {item.tax ? `₦${item.tax.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            {result.taxType === 'paye' && (
              <p>This calculation uses the Personal Income Tax Act brackets with the Consolidated Relief Allowance. The actual tax may differ based on your specific deductions and exemptions.</p>
            )}
            {result.taxType === 'cit' && (
              <p>Company Income Tax is calculated at 30% (or 25% for small companies meeting the criteria). Expenses must be allowable under the CITA.</p>
            )}
            {result.taxType === 'vat' && (
              <p>VAT is calculated at 15% standard rate. Output VAT is collected on sales, Input VAT is paid on purchases. Net VAT = Output - Input.</p>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button className="px-6 py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800">
              Generate PDF Form
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              Save Calculation
            </button>
          </div>
        </div>
      )}

      {/* Info Section */}
      {!result && !loading && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-lg mb-4">How This Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">1️⃣</div>
              <h3 className="font-medium">Add Income</h3>
              <p className="text-sm text-gray-500 mt-1">Add all your income for the year first</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">2️⃣</div>
              <h3 className="font-medium">Add Expenses</h3>
              <p className="text-sm text-gray-500 mt-1">Record deductible expenses</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">3️⃣</div>
              <h3 className="font-medium">Calculate Tax</h3>
              <p className="text-sm text-gray-500 mt-1">We calculate your exact liability</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}