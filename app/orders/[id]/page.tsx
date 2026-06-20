"use client";

import { useEffect, useState, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { UserContext } from "@/components/UserContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import SafeImage from "@/components/ui/SafeImage";
import { resolveImageUrl } from "@/lib/storage";
import { toast } from "sonner";

interface OrderItemRow {
  product_id: string;
  price_at_purchase: number;
  quantity: number;
  products: {
    id: string;
    name: string;
    image_url?: string | null;
    seller_id: string;
    location: string;
  } | null;
}

interface OrderDetail {
  id: string;
  buyer_id: string;
  status: "pending" | "completed" | "cancelled" | "shipped" | "delivered";
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
  order_items: OrderItemRow[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
];

function buyerName(p: OrderDetail["profiles"]): string {
  if (!p) return "Unknown Buyer";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown Buyer";
}

function statusVariant(
  status: OrderDetail["status"]
): "success" | "info" | "warning" | "default" {
  switch (status) {
    case "completed":
    case "delivered":
      return "success";
    case "shipped":
      return "info";
    case "cancelled":
      return "default";
    default:
      return "warning";
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updating, setUpdating] = useState(false);

  const id = typeof params?.id === "string" ? params.id : "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, buyer_id, status, created_at,
           profiles:buyer_id(first_name, last_name),
           order_items(product_id, price_at_purchase, quantity,
             products!inner(id, name, image_url, seller_id, location))`
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrder(data as unknown as OrderDetail);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The signed-in user can update status only if they are the seller of
  // at least one line item. Buyers see the order read-only.
  const isSeller =
    !!user?.id && !!order?.order_items.some((it) => it.products?.seller_id === user.id);

  const lineTotal = (it: OrderItemRow) =>
    Number(it.price_at_purchase || 0) * Number(it.quantity || 0);

  const grandTotal =
    order?.order_items.reduce((sum, it) => sum + lineTotal(it), 0) ?? 0;

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    const previous = order.status;
    setOrder({ ...order, status: newStatus as OrderDetail["status"] });
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);
    if (error) {
      setOrder({ ...order, status: previous });
      toast.error(`Failed to update order: ${error.message}`);
    } else {
      toast.success(`Order updated to ${newStatus}`);
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-2xl font-bold text-slate-900">Order not found</h1>
        <p className="text-gray-500">
          This order may have been removed, or you may not have access to it.
        </p>
        <Button onClick={() => router.push("/seller-dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const shortId = order.id.slice(0, 8);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Link
        href="/seller-dashboard"
        className="text-gray-500 no-underline text-sm inline-flex items-center gap-1 hover:text-blue-700 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Order #{shortId}
        </h1>
        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
        <span>
          Buyer:{" "}
          <Link
            href={`/profile/${order.buyer_id}`}
            className="text-blue-600 font-semibold hover:underline"
          >
            {buyerName(order.profiles)}
          </Link>
        </span>
        <span>
          Placed: {new Date(order.created_at).toLocaleDateString()}
        </span>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-800">Order Items</h2>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100">
          {order.order_items.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No items found.</div>
          ) : (
            order.order_items.map((it) => {
              const p = it.products;
              return (
                <div
                  key={`${it.product_id}-${order.id}`}
                  className="flex gap-4 items-center p-4"
                >
                  <Link
                    href={p ? `/product/${p.id}` : "#"}
                    className="shrink-0"
                    aria-label={p ? `View ${p.name}` : undefined}
                  >
                    {p?.image_url ? (
                      <SafeImage
                        src={resolveImageUrl(p.image_url, "product-images")}
                        alt={p.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    {p ? (
                      <Link
                        href={`/product/${p.id}`}
                        className="font-bold text-slate-900 text-sm hover:text-blue-700"
                      >
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-bold text-slate-900 text-sm">
                        Unknown product
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      ${Number(it.price_at_purchase).toFixed(2)} × {it.quantity}
                      {p?.location ? ` · 📍 ${p.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">
                      ${lineTotal(it).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-gray-100">
            <span className="text-sm font-bold text-slate-700">Total</span>
            <span className="text-lg font-black text-blue-600">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {isSeller && (
        <Card>
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <h2 className="text-base font-bold text-slate-800">Update Status</h2>
          </CardHeader>
          <CardContent className="p-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={order.status}
              disabled={updating}
              onChange={(e) => updateStatus(e.target.value)}
              className="w-full md:w-1/3 p-2 text-sm border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">
              You're listed as the seller on at least one line item, so you
              can update this order's status.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
