'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TaxRecord {
  _id: string;
  taxType: string;
  assessmentYear: number;
  totalIncome: number;
  taxableIncome: number;
  taxLiability: number;
  status: string;
  createdAt: string;
}

export default function IndividualFormsPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const tier = (session?.user as any)?.tier || 'individual';

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/tax/calculate');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'finalized': return 'bg-blue-100 text-blue-700';
      case 'submitted': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const taxTypeLabels: Record<string, string> = {
    paye: 'PAYE',
    cit: 'Company Income Tax',
    vat: 'VAT',
    wht: 'Withholding Tax',
    cgt: 'Capital Gains Tax',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Tax Forms</h1>
        <p className="text-gray-600">View and download your generated tax forms</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No tax calculations yet</h2>
          <p className="text-gray-500 mb-6">Calculate your taxes first, then download your forms.</p>
          <a
            href={`/${tier}/tax`}
            className="inline-block px-6 py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800"
          >
            Go to Tax Calculator
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 uppercase">
                      {taxTypeLabels[record.taxType] || record.taxType}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">Assessment Year {record.assessmentYear}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Generated {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ₦{record.taxLiability.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Tax Liability</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex gap-3">
                <button className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800">
                  Download PDF
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}