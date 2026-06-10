"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { UserContext } from "@/components/UserContext";
import { useContext } from "react";

export default function BuyerDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;

  return (
    <DashboardLayout userRole="individual">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900">Buyer Dashboard</h2>
          <p className="text-gray-500 font-medium">Welcome back, {user?.email?.split('@')[0]}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/marketplace" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏗️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Materials Marketplace</h3>
            <p className="text-gray-500 text-sm">Buy high-quality construction materials from verified sellers.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Enter Shop →</div>
          </Link>

          <Link href="/artisans" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Find Artisans</h3>
            <p className="text-gray-500 text-sm">Hire professional electricians, plumbers, and carpenters.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Explore Experts →</div>
          </Link>

          <Link href="/messages" className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Messages</h3>
            <p className="text-gray-500 text-sm">Chat with sellers and artisans about your requirements.</p>
            <div className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-wider">Open Chat →</div>
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Access</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/cart" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">My Cart</Link>
            <Link href="/checkout" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Proceed to Payment</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
