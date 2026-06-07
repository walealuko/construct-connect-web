import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Income from '@/models/Income';
import Expense from '@/models/Expense';
import TaxRecord from '@/models/TaxRecord';

export default async function BusinessDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  const [incomes, expenses, taxRecords] = await Promise.all([
    Income.find({ userId, date: { $gte: startOfYear, $lte: endOfYear } }),
    Expense.find({ userId, date: { $gte: startOfYear, $lte: endOfYear } }),
    TaxRecord.find({ userId, assessmentYear: currentYear }).sort({ createdAt: -1 }),
  ]);

  const totalRevenue = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const estimatedTax = taxRecords.reduce((sum, rec) => sum + rec.taxLiability, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
        <p className="text-gray-600">Year {currentYear}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-700">
            ₦{totalRevenue.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Total Revenue</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-gray-700">
            ₦{totalExpenses.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Total Expenses</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-blue-700">
            ₦{netProfit.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Net Profit</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-orange-600">
            ₦{estimatedTax.toLocaleString()}
          </div>
          <div className="text-gray-500 text-sm mt-1">Estimated Tax</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <a href="/business/income" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <div className="text-2xl mb-2">💰</div>
            <div className="font-medium text-green-800">Revenue</div>
            <div className="text-sm text-green-600">Track sales</div>
          </a>
          <a href="/business/expenses" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <div className="text-2xl mb-2">📤</div>
            <div className="font-medium text-blue-800">Expenses</div>
            <div className="text-sm text-blue-600">Track costs</div>
          </a>
          <a href="/business/tax" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <div className="text-2xl mb-2">🧮</div>
            <div className="font-medium text-purple-800">VAT/CIT</div>
            <div className="text-sm text-purple-600">Calculate tax</div>
          </a>
          <a href="/business/forms" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-orange-800">Forms</div>
            <div className="text-sm text-orange-600">Download</div>
          </a>
        </div>
      </div>

      {/* Tax Summary */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-4">Tax Liabilities</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">PAYE (Employees)</div>
            <div className="text-xl font-semibold">₦0</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">VAT Payable</div>
            <div className="text-xl font-semibold">₦0</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">CIT Liability</div>
            <div className="text-xl font-semibold">₦0</div>
          </div>
        </div>
      </div>
    </div>
  );
}