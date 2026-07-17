"use client";

import React, { useState, useContext } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { UserContext } from "@/components/UserContext";
import { useBuyerData } from "@/components/dashboard/useBuyerData";
import { primaryImage } from "@/types/database";
import SafeImage from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { resolveImageUrl } from "@/lib/storage";
import { useRouter } from "next/navigation";

export default function BuyerDashboard() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const router = useRouter();
  const {
    profile,
    orders,
    viewedProducts,
    conversations,
    loading,
    removeViewedProduct,
    deleteOrder,
  } = useBuyerData();
  // Tracks the order id currently being soft-deleted so the row's
  // ✕ button shows a spinner and the confirm button disables while
  // the round-trip is in flight.
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  // Soft-delete confirmation. We hold the candidate order id in
  // state and show a modal — same pattern as
  // components/dashboard/ConfirmDeleteModal on the seller side,
  // but rendered inline here because we only have one consumer.
  const [confirmOrderDelete, setConfirmOrderDelete] = useState<string | null>(null);

  // Wraps the hook's deleteOrder so we can set/clear the
  // "currently deleting" state and reset the confirm dialog. The
  // hook owns the optimistic splice + rollback + server action.
  const handleDeleteOrder = async (orderId: string) => {
    setConfirmOrderDelete(null);
    setDeletingOrderId(orderId);
    try {
      await deleteOrder(orderId);
    } finally {
      setDeletingOrderId(null);
    }
  };

  return (
    <DashboardLayout userRole="individual">
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Buyer Hub</h2>
            <p className="text-gray-500 font-medium">Manage your orders and account details</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="secondary" className="px-4 py-2 text-sm font-bold">
              <Link href="/cart">My Cart</Link>
            </Button>
            <Button asChild className="px-4 py-2 text-sm font-bold">
              <Link href="/messages">Messages</Link>
            </Button>
          </div>
        </div>

        {/* Supporting Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Widget */}
          <Card className="h-fit overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-gray-100">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-slate-900">{profile?.full_name || "User Profile"}</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-400">Location</span>
                <span className="font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-t border-gray-50">
                <span className="text-gray-400">Tier</span>
                <Badge variant="info">{profile?.tier || "individual"}</Badge>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-gray-100 p-3">
              <Link href="/profile/edit" className="w-full text-center text-xs font-bold text-blue-600 hover:underline">
                Edit Profile Details →
              </Link>
            </CardFooter>
          </Card>

          {/* Order History + Messages */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Order History</h3>
                <span className="text-xs text-gray-400">
                  {orders.length} {orders.length === 1 ? "order" : "orders"}
                </span>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No orders found. Start shopping!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-base">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold tracking-wider">
                        <tr>
                          <th className="px-5 py-4">Order</th>
                          <th className="px-5 py-4">Total</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Date</th>
                          <th className="px-3 py-4 w-10" aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.map(order => (
                          <tr
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
                            /* py-5 (was py-3) and text-base (was
                               text-sm) so the rows are easier to
                               scan and the totals don't feel like
                               footnotes. */
                            className="group hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="px-5 py-5 font-semibold text-blue-600 hover:underline">#{order.id.slice(-6)}</td>
                            <td className="px-5 py-5 font-bold text-slate-900 text-lg">{formatNaira(order.total_price)}</td>
                            <td className="px-5 py-5">
                              <Badge
                                variant={order.status === 'completed' ? 'success' : order.status === 'shipped' ? 'info' : order.status === 'cancelled' ? 'default' : 'warning'}
                                className="text-sm px-3 py-1"
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-5 text-right text-gray-500 text-sm">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-5 w-10 text-right">
                              {/* Hover-revealed "remove from my
                                  history" button. stopPropagation so
                                  the row's onClick (which navigates
                                  to the order detail) doesn't fire
                                  when the user just wants to remove
                                  the order from their history. The
                                  modal asks for explicit confirm —
                                  this is a destructive action and
                                  we don't want a single misclick to
                                  wipe the row. */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmOrderDelete(order.id);
                                }}
                                aria-label="Remove order from history"
                                title="Remove from history"
                                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full text-red-500 hover:bg-red-50 transition-all inline-flex items-center justify-center"
                              >
                                <span className="text-sm font-bold leading-none">✕</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages Widget */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Messages</h3>
                <Link href="/messages" className="text-xs font-bold text-blue-600 hover:underline">
                  Open Inbox →
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="text-3xl">💬</div>
                    <p className="text-gray-400 text-sm">
                      No conversations yet.{" "}
                      <Link href="/marketplace" className="text-blue-600 font-semibold hover:underline">
                        Find sellers on the Marketplace →
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => {
                      const otherId = conv.participant_ids.find((id) => id !== user?.id);
                      const other = conv.profiles?.find((p) => p.id === otherId);
                      const otherName = other
                        ? `${other.first_name ?? ""} ${other.last_name ?? ""}`.trim() || "Unknown"
                        : "Unknown";
                      return (
                        <Link
                          key={conv.id}
                          href={`/messages?convId=${conv.id}`}
                          className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                            {(other?.first_name ?? "?")[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-2">
                              <p className="text-sm font-bold text-slate-900 truncate">{otherName}</p>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {new Date(conv.last_message_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {conv.last_message || "Start a conversation…"}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recently Viewed Widget */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-xl font-bold text-slate-800">Recently Viewed</h3>
            <span className="text-xs text-gray-400">{viewedProducts.length} items in history</span>
          </div>
          <Card>
            <CardContent className="p-6">
              {loading && viewedProducts.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                  ))}
                </div>
              ) : viewedProducts.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="text-4xl">🛍️</div>
                  <p className="text-gray-400 text-sm">You haven't viewed any products yet. Start exploring!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                  {viewedProducts.map(product => (
                    <div key={product.id} className="relative group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all shadow-sm overflow-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-red-500 w-8 h-8 rounded-full hover:bg-red-50 transition-all shadow"
                        onClick={() => removeViewedProduct(product.id)}
                        title="Remove from history"
                        aria-label="Remove from history"
                      >
                        <span className="text-base font-bold leading-none">✕</span>
                      </Button>
                      <Link href={`/product/${product.id}`} className="block">
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          {primaryImage(product) ? (
                            <SafeImage src={resolveImageUrl(primaryImage(product), 'product-images')} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🏗️</div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{product.name}</p>
                          <p className="text-base text-blue-600 font-bold">{formatNaira(product.price)}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Access Bottom Bar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 justify-center">
            <Button asChild variant="secondary" className="px-6">
              <Link href="/cart">My Cart</Link>
            </Button>
            <Button asChild className="px-6">
              <Link href="/checkout">Proceed to Payment</Link>
            </Button>
            <Button asChild variant="secondary" className="px-6 bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
              <Link href="/projects/post">Post a Project</Link>
            </Button>
        </div>
      </div>

      {/* Confirm modal for "remove from history" on an order. We
          render the modal inline (no shared component) because
          it's a one-off pattern for the buyer dashboard and a
          one-button confirm doesn't justify a shared
          ConfirmDeleteModal mount. */}
      {confirmOrderDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-order-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 id="confirm-delete-order-title" className="text-lg font-bold text-slate-900">
              Remove this order from your history?
            </h3>
            <p className="text-sm text-gray-600">
              The order will be hidden from your view, but the seller still has the
              records they need to fulfil it. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmOrderDelete(null)}
                disabled={!!deletingOrderId}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleDeleteOrder(confirmOrderDelete)}
                isLoading={!!deletingOrderId}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

