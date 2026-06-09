'use client';

import React from 'react';

export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 max-w-md mx-auto text-center bg-white rounded-xl shadow-sm my-12">
      <div className="text-4xl mb-4">🛒</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Marketplace Error</h2>
      <p className="text-gray-600 mb-6">We couldn't load the products right now. Please try again.</p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors"
      >
        Refresh Products
      </button>
    </div>
  );
}
