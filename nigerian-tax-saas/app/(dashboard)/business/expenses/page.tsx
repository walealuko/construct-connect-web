'use client';

import { useState, useEffect } from 'react';

interface Expense {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

const categoryLabels: Record<string, string> = {
  salaries: 'Salaries & Wages',
  rent: 'Rent',
  utilities: 'Utilities',
  transport: 'Transport',
  inventory: 'Inventory',
  marketing: 'Marketing',
  professional_services: 'Professional Services',
  other: 'Other',
};

export default function BusinessExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: 'other',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err) { console.error('Failed to fetch expenses'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? '/api/expenses' : '/api/expenses';
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { id: editingId, ...formData } : formData;

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setFormData({ category: 'other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
        setShowForm(false);
        setEditingId(null);
        fetchExpenses();
      }
    } catch (err) { console.error('Failed to save expense'); }
  };

  const handleEdit = (expense: Expense) => {
    setFormData({ category: expense.category, description: expense.description, amount: expense.amount.toString(), date: new Date(expense.date).toISOString().split('T')[0] });
    setEditingId(expense._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    } catch (err) { console.error('Failed to delete expense'); }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track your business costs and deductions</p>
        </div>
        <button onClick={() => { setFormData({ category: 'other', description: '', amount: '', date: new Date().toISOString().split('T')[0] }); setEditingId(null); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">+ Add Expense</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="text-3xl font-bold text-gray-700">₦{totalExpenses.toLocaleString()}</div>
        <div className="text-gray-500">Total expenses this year</div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-lg mb-4">{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full">
                <option value="salaries">Salaries & Wages</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="transport">Transport</option>
                <option value="inventory">Inventory</option>
                <option value="marketing">Marketing</option>
                <option value="professional_services">Professional Services</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., January rent" required className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="50000" required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="w-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editingId ? 'Update' : 'Save'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📤</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No expenses recorded</h2>
          <p className="text-gray-500 mb-6">Track your costs to reduce tax liability.</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Add Your First Expense</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Description</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense._id} className="border-b last:border-0">
                  <td className="px-6 py-4"><span className="text-xs bg-gray-100 px-2 py-1 rounded">{categoryLabels[expense.category] || expense.category}</span></td>
                  <td className="px-6 py-4 text-gray-900">{expense.description}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(expense.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">₦{expense.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(expense)} className="text-blue-600 hover:text-blue-800 mr-3 text-sm">Edit</button>
                    <button onClick={() => handleDelete(expense._id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}