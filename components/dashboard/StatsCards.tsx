"use client";

import { Card } from "@/components/ui/Card";
import { formatNaira } from "@/lib/format";

interface StatsCardsProps {
  revenue: number;
  ordersCount: number;
  productsCount: number;
  // What's the "products" stat called? Seller says "Total Products",
  // artisan says "Active Listings".
  productsLabel?: string;
}

/**
 * Three stat cards: revenue, active orders, products.
 * Revenue is real (computed from order_items), not a placeholder.
 */
export function StatsCards({ revenue, ordersCount, productsCount, productsLabel = "Total Products" }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-md">
        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
        <p className="text-3xl font-black">{formatNaira(revenue)}</p>
      </Card>
      <Card className="p-4">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Orders</p>
        <p className="text-3xl font-black text-slate-900">{ordersCount}</p>
      </Card>
      <Card className="p-4">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{productsLabel}</p>
        <p className="text-3xl font-black text-slate-900">{productsCount}</p>
      </Card>
    </div>
  );
}
