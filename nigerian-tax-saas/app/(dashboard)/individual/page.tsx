import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Income from '@/models/Income';
import Expense from '@/models/Expense';
import TaxRecord from '@/models/TaxRecord';

export default async function IndividualDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;
  await dbConnect();

  // Get current year data
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  const [incomes, expenses, taxRecords] = await Promise.all([
    Income.find({ userId, date: { $gte: startOfYear, $lte: endOfYear } }),
    Expense.find({ userId, date: { $gte: startOfYear, $lte: endOfYear } }),
    TaxRecord.find({ userId, assessmentYear: currentYear }).sort({ createdAt: -1 }),
  ]);

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const estimatedTax = taxRecords.reduce((sum, rec) => sum + rec.taxLiability, 0);

  const incomeSources = incomes.reduce((acc: Record<string, number>, inc) => {
    acc[inc.source] = (acc[inc.source] || 0) + inc.amount;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Tax Dashboard</h1>
        <p className="text-gray-600">Year {currentYear}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-700">
            ₦{totalIncome.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Total Income</div>
          <div className="text-xs text-gray-400 mt-2">{incomes.length} entries</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-gray-700">
            ₦{totalExpenses.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Total Expenses</div>
          <div className="text-xs text-gray-400 mt-2">{expenses.length} entries</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-orange-600">
            ₦{estimatedTax.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Estimated Tax</div>
          <div className="text-xs text-gray-400 mt-2">{taxRecords.length} calculations</div>
        </div>
      </div>

      {/* Income by Source */}
      {Object.keys(incomeSources).length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="font-semibold text-lg mb-4">Income by Source</h2>
          <div className="space-y-3">
            {Object.entries(incomeSources).map(([source, amount]) => (
              <div key={source} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">{source.replace('_', ' ')}</span>
                <span className="font-semibold text-gray-900">₦{amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <a href="/individual/income" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <div className="text-2xl mb-2">💰</div>
            <div className="font-medium text-green-800">Add Income</div>
            <div className="text-sm text-green-600">Record your earnings</div>
          </a>
          <a href="/individual/expenses" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <div className="text-2xl mb-2">📤</div>
            <div className="font-medium text-blue-800">Add Expense</div>
            <div className="text-sm text-blue-600">Track your costs</div>
          </a>
          <a href="/individual/tax" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <div className="text-2xl mb-2">🧮</div>
            <div className="font-medium text-orange-800">Calculate Tax</div>
            <div className="text-sm text-orange-600">See what you owe</div>
          </a>
        </div>
      </div>

      {/* Recent Tax Records */}
      {taxRecords.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-lg mb-4">Recent Calculations</h2>
          <div className="space-y-3">
            {taxRecords.slice(0, 5).map((record) => (
              <div key={record._id.toString()} className="flex justify-between items-center py-3 border-b last:border-0">
                <div>
                  <span className="font-medium uppercase">{record.taxType}</span>
                  <span className="text-gray-500 text-sm ml-2">{record.assessmentYear}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₦{record.taxLiability.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 capitalize">{record.status}</div>
                </div>
              </div>
            ))}
          </div>
          <a href="/individual/forms" className="mt-4 block text-center text-green-700 font-medium hover:underline">
            View all forms →
          </a>
        </div>
      )}

      {/* Empty State */}
      {incomes.length === 0 && expenses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No data yet</h2>
          <p className="text-gray-500 mb-6">Start by adding your income and expenses to calculate your taxes.</p>
          <a href="/individual/income" className="inline-block px-6 py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800">
            Add Your First Income
          </a>
        </div>
      )}
    </div>
  );
}