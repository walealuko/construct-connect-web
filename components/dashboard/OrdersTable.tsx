"use client";

import { Order } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onStatusChange: (orderId: string, newStatus: string) => void;
  emptyMessage?: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

function statusVariant(status: Order["status"]): "success" | "info" | "warning" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "shipped":
      return "info";
    case "delivered":
      return "info";
    default:
      return "warning";
  }
}

function buyerName(order: Order): string {
  const first = order.profiles?.first_name?.trim();
  const last = order.profiles?.last_name?.trim();
  if (first || last) return `${first ?? ""} ${last ?? ""}`.trim();
  return "Unknown Buyer";
}

export function OrdersTable({ orders, loading, onStatusChange, emptyMessage = "No orders found yet." }: OrdersTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="grid grid-cols-4 bg-slate-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
          <div className="px-6 py-4">Buyer</div>
          <div className="px-6 py-4">Date</div>
          <div className="px-6 py-4">Status</div>
          <div className="px-6 py-4 text-right">Action</div>
        </div>
        <div className="divide-y divide-gray-100">
          {loading && orders.length === 0 ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-gray-400">{emptyMessage}</div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-4 hover:bg-slate-50 transition-colors text-sm items-center"
              >
                <div className="px-6 py-4 text-slate-900 font-medium">{buyerName(order)}</div>
                <div className="px-6 py-4 text-slate-500 text-xs">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
                <div className="px-6 py-4">
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                </div>
                <div className="px-6 py-4 text-right">
                  <select
                    value={order.status}
                    onChange={(e) => onStatusChange(order.id, e.target.value)}
                    className="p-1 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
