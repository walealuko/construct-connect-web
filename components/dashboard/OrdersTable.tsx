"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const router = useRouter();
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        {/* The previous header used `text-xs` and `py-4` — readable
            on a phone but cramped on a desktop. Bumping to `text-sm`
            and `py-5` makes the column labels line up with the
            bigger row height below. */}
        <div className="grid grid-cols-4 bg-slate-50 border-b border-gray-200 text-gray-500 uppercase text-sm font-bold tracking-wider">
          <div className="px-6 py-5">Buyer</div>
          <div className="px-6 py-5">Date</div>
          <div className="px-6 py-5">Status</div>
          <div className="px-6 py-5 text-right">Action</div>
        </div>
        <div className="divide-y divide-gray-100">
          {loading && orders.length === 0 ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-base">{emptyMessage}</div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/orders/${order.id}`);
                  }
                }}
                /* Each row is now a `py-5` cell with `text-base` —
                   was `py-4 text-sm` before, which made the table
                   feel cramped and the dates too small to read at
                   a glance. The bigger padding also gives the
                   status select enough room to render at a usable
                   size. */
                className="grid grid-cols-4 hover:bg-slate-50 transition-colors text-base items-center cursor-pointer"
              >
                <div className="px-6 py-5 text-slate-900 font-semibold">
                  <Link
                    href={`/profile/${order.buyer_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {buyerName(order)}
                  </Link>
                </div>
                <div className="px-6 py-5 text-slate-600 text-sm">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
                <div className="px-6 py-5">
                  <Badge variant={statusVariant(order.status)} className="text-sm px-3 py-1">
                    {order.status}
                  </Badge>
                </div>
                <div className="px-6 py-5 text-right">
                  <select
                    value={order.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStatusChange(order.id, e.target.value);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
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
