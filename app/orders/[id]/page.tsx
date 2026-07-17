"use client";

import { useEffect, useState, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { UserContext } from "@/components/UserContext";
import { updateOrderStatusAction } from "@/app/actions/orders";
import { openDisputeAction } from "@/app/actions/disputes";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import { toast } from "sonner";
import { formatNaira } from "@/lib/format";

interface OrderItemRow {
  product_id: string;
  price_at_purchase: number;
  quantity: number;
  products: {
    id: string;
    name: string;
    images: string[];
    seller_id: string;
    location: string;
  } | null;
}

interface OrderDetail {
  id: string;
  buyer_id: string;
  // "disputed" is the new status set by openDisputeAction. The
  // order-update route is a no-op for it (the existing
  // STATUS_OPTIONS list doesn't include it), and the seller-side
  // status select in this page is disabled when the order is
  // disputed — resolution is a human process.
  status: "pending" | "completed" | "cancelled" | "shipped" | "delivered" | "disputed";
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
  // The reason the user is typing into the open-dispute modal.
  // Reset to "" when the modal closes.
  const [disputeReason, setDisputeReason] = useState("");
  // True while openDisputeAction is in flight. Disables the
  // submit button + spinner.
  const [submittingDispute, setSubmittingDispute] = useState(false);
  // Modal visibility. We use a separate flag from `disputeReason`
  // because the input is allowed to be empty while the modal is
  // open (the user might cancel before typing). The Open button
  // flips this to true; Cancel flips it to false.
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  // Track the open dispute for the banner at the top of the
  // page. The order's status flips to 'disputed' but we also
  // want the open date for the banner copy.
  const [openDispute, setOpenDispute] = useState<{ created_at: string } | null>(null);

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
             products!inner(id, name, images, seller_id, location))`
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

      // Pull the open dispute for this order (if any) so we can
      // show the post-dispute banner with the right date. RLS
      // scopes this to either party on the order, so the same
      // query works for both buyers and sellers viewing the page.
      const { data: disputeRow } = await supabase
        .from("disputes")
        .select("id, status, created_at")
        .eq("order_id", id)
        .eq("status", "open")
        .maybeSingle();
      if (cancelled) return;
      setOpenDispute(disputeRow ? { created_at: disputeRow.created_at } : null);
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
  // Either party on the order can open a dispute. The action layer
  // is the source of truth (re-checks membership + RLS gates the
  // row), but the UI gate avoids the "submit → fail" round-trip.
  const isPartyToOrder =
    !!user?.id &&
    !!order &&
    (order.buyer_id === user.id || isSeller);
  // Cancelled orders can't be disputed (the buyer backed out, the
  // seller already settled). Disputed orders can't be
  // re-disputed (the action layer would reject, but the UI gate
  // saves a round-trip).
  const canOpenDispute =
    isPartyToOrder &&
    !!order &&
    order.status !== "cancelled" &&
    order.status !== "disputed";

  const submitDispute = async () => {
    if (!order) return;
    const trimmed = disputeReason.trim();
    // The action layer is also a safety net, but the client-side
    // check gives the user instant feedback and avoids the
    // "submitted a half-empty form" confusion.
    if (trimmed.length < 10) {
      toast.error("Please describe the issue in at least 10 characters");
      return;
    }
    setSubmittingDispute(true);
    const result = await openDisputeAction({ orderId: order.id, reason: trimmed });
    setSubmittingDispute(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Dispute opened. Our team will review and follow up by email.");
    setDisputeReason("");
    // Re-fetch the order + dispute so the local state reflects
    // the server: status flips to 'disputed' and the banner
    // appears with the dispute date.
    const { data: refreshed } = await supabase
      .from("orders")
      .select("id, buyer_id, status, created_at")
      .eq("id", order.id)
      .maybeSingle();
    if (refreshed) {
      setOrder((prev) => prev ? { ...prev, status: refreshed.status as OrderDetail["status"] } : prev);
    }
    const { data: disputeRow } = await supabase
      .from("disputes")
      .select("created_at")
      .eq("order_id", order.id)
      .eq("status", "open")
      .maybeSingle();
    if (disputeRow) {
      setOpenDispute({ created_at: disputeRow.created_at });
    }
  };

  const lineTotal = (it: OrderItemRow) =>
    Number(it.price_at_purchase || 0) * Number(it.quantity || 0);

  const grandTotal =
    order?.order_items.reduce((sum, it) => sum + lineTotal(it), 0) ?? 0;

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    const previous = order.status;
    // Optimistic local update so the seller sees the new status
    // immediately. If the server action fails, we revert.
    setOrder({ ...order, status: newStatus as OrderDetail["status"] });
    const result = await updateOrderStatusAction(order.id, newStatus);
    if (!result.success) {
      setOrder({ ...order, status: previous });
      toast.error(`Failed to update order: ${result.error}`);
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
                    {p ? (
                      <ProductImageGallery images={p.images ?? []} alt={p.name} compact />
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
                      {formatNaira(Number(it.price_at_purchase))} × {it.quantity}
                      {p?.location ? ` · 📍 ${p.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">
                      {formatNaira(lineTotal(it))}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-gray-100">
            <span className="text-sm font-bold text-slate-700">Total</span>
            <span className="text-lg font-black text-blue-600">
              {formatNaira(grandTotal)}
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
              disabled={updating || order.status === "disputed"}
              onChange={(e) => updateStatus(e.target.value)}
              className="w-full md:w-1/3 p-2 text-sm border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {order.status === "disputed" ? (
              <p className="text-xs text-red-600 mt-2">
                This order is in dispute. Status changes are paused until
                the team resolves it.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                You're listed as the seller on at least one line item, so you
                can update this order's status.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-dispute banner. Renders above the order items so a
          returning visitor immediately sees that something needs
          their attention. The "open a dispute" button is gone by
          this point (the action layer would reject a duplicate
          anyway). */}
      {openDispute && order.status === "disputed" && (
        <div
          role="status"
          className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3"
        >
          <span className="text-2xl" aria-hidden>⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Dispute opened on{" "}
              {new Date(openDispute.created_at).toLocaleDateString()}.
            </p>
            <p className="text-xs text-red-700 mt-1">
              Our team will review and follow up via email. Status
              changes are paused until the dispute is resolved.
            </p>
          </div>
        </div>
      )}

      {/* "Open a dispute" button. Either party (buyer or seller)
          can open one — the action layer is the gate. The button
          is hidden when the order is already disputed or
          cancelled, when the user isn't a party, and when the
          order hasn't loaded yet. */}
      {canOpenDispute && (
        <Card>
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <h2 className="text-base font-bold text-slate-800">Need help with this order?</h2>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <p className="text-sm text-gray-600 flex-1 min-w-[200px]">
              If something went wrong with this order, open a dispute and
              our team will review it within 1 business day.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDisputeReason("");
                setDisputeModalOpen(true);
                // Focus the textarea after the modal mounts.
                // requestAnimationFrame defers until React has
                // committed the new element so the focus call
                // doesn't land on a stale node.
                requestAnimationFrame(() => {
                  document
                    .getElementById("open-dispute-reason")
                    ?.focus();
                });
              }}
              className="px-4 py-2 text-sm font-bold border-red-200 text-red-600 hover:bg-red-50"
            >
              Open a dispute
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open-dispute modal. Same one-off inline pattern as the
          buyer-dashboard's confirm modal — no shared component
          because it's a one-button submit. The submit is gated
          on a non-empty reason; the action layer does the
          authoritative validation. */}
      {disputeModalOpen && canOpenDispute && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-dispute-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 id="open-dispute-title" className="text-lg font-bold text-slate-900">
              Open a dispute
            </h3>
            <p className="text-sm text-gray-600">
              Tell us what went wrong. A team member will review the order
              and follow up via email.
            </p>
            <div className="space-y-1.5">
              <label
                htmlFor="open-dispute-reason"
                className="text-xs font-bold text-gray-500 uppercase tracking-wider"
              >
                Reason
              </label>
              <textarea
                id="open-dispute-reason"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Describe the issue (10–2000 characters)…"
                className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submittingDispute}
              />
              <p className="text-[10px] text-gray-400">
                {disputeReason.length}/2000 characters
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDisputeReason("");
                  setDisputeModalOpen(false);
                }}
                disabled={submittingDispute}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitDispute}
                isLoading={submittingDispute}
                disabled={submittingDispute || disputeReason.trim().length < 10}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Submit dispute
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
