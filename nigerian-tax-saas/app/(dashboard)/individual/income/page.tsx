'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Income {
  _id: string;
  source: string;
  description: string;
  amount: number;
  date: string;
  payerName?: string;
}

export default function IndividualIncomePage() {
  const { data: session } = useSession();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    source: 'self_employed',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payerName: '',
  });

  const tier = (session?.user as any)?.tier || 'individual';

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    try {
      const res = await fetch('/api/income');
      const data = await res.json();
      setIncomes(data.incomes || []);
    } catch (err) {
      console.error('Failed to fetch incomes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId ? '/api/income' : '/api/income';
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { id: editingId, ...formData } : formData;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setFormData({
          source: 'self_employed',
          description: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          payerName: '',
        });
        setShowForm(false);
        setEditingId(null);
        fetchIncomes();
      }
    } catch (err) {
      console.error('Failed to save income');
    }
  };

  const handleEdit = (income: Income) => {
    setFormData({
      source: income.source,
      description: income.description,
      amount: income.amount.toString(),
      date: new Date(income.date).toISOString().split('T')[0],
      payerName: income.payerName || '',
    });
    setEditingId(income._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income entry?')) return;

    try {
      const res = await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchIncomes();
    } catch (err) {
      console.error('Failed to delete income');
    }
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  const sourceLabels: Record<string, string> = {
    employment: 'Salary/Employment',
    self_employed: 'Self-Employed',
    business: 'Business',
    rental: 'Rental Income',
    investments: 'Investments',
    other: 'Other',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income</h1>
          <p className="text-gray-600">Track all money you received</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              source: 'self_employed',
              description: '',
              amount: '',
              date: new Date().toISOString().split('T')[0],
              payerName: '',
            });
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium"
        >
          + Add Income
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="text-3xl font-bold text-green-700">₦{totalIncome.toLocaleString()}</div>
        <div className="text-gray-500">Total income this year</div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-lg mb-4">{editingId ? 'Edit Income' : 'Add New Income'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Income Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full"
              >
                <option value="self_employed">Self-Employed</option>
                <option value="employment">Employment/Salary</option>
                <option value="business">Business</option>
                <option value="rental">Rental Income</option>
                <option value="investments">Investments</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Consulting work for ABC Ltd"
                required
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="250000"
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payer Name (optional)</label>
              <input
                type="text"
                value={formData.payerName}
                onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                placeholder="e.g., ABC Company Ltd"
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium"
              >
                {editingId ? 'Update' : 'Save'} Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Income List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : incomes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No income recorded yet</h2>
          <p className="text-gray-500 mb-6">Add your first income entry to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800"
          >
            Add Your First Income
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Source</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Description</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((income) => (
                <tr key={income._id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                      {sourceLabels[income.source] || income.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{income.description}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(income.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    ₦{income.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(income)}
                      className="text-green-600 hover:text-green-800 mr-3 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(income._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
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