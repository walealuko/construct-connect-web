"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

// Three terminal states the page can land in. "verifying" is the
// initial in-flight state; "success" and "error" are the two
// outcomes the verify endpoint can return.
type Status = "verifying" | "success" | "error";

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<Status>("verifying");
  // The order id from a successful verify, so we can deep-link the
  // buyer to their order details page rather than the marketplace.
  // Captured from the verify response, not from the URL, so a
  // tampered URL can't redirect them to another buyer's order.
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!reference) {
        setStatus("error");
        return;
      }

      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          // The verify route only sets orderId on a successful
          // finalize or an already-completed short-circuit. Either
          // way, take the buyer to the order they paid for.
          if (data.orderId) setOrderId(data.orderId);
          toast.success("Payment verified! Your order is complete.");
        } else {
          throw new Error(data.error || "Verification failed");
        }
      } catch (err: any) {
        console.error("Verification Error:", err);
        setStatus("error");
        toast.error(err.message || "Payment could not be verified.");
      }
    }

    verifyPayment();
  }, [reference]);

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
      {status === "verifying" && (
        <>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verifying Payment</h1>
          <p className="text-gray-500 mb-6">Please wait while we confirm your transaction with Paystack...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 mb-8">Thank you for your purchase. Your order is now being processed.</p>
          <div className="space-y-3">
            {orderId ? (
              <Link
                href={`/orders/${orderId}`}
                className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Order
              </Link>
            ) : null}
            <Link
              href="/buyer-dashboard"
              className="block w-full py-3 bg-white border border-gray-200 text-slate-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✕</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h1>
          <p className="text-gray-500 mb-8">We couldn't verify your payment. If you were charged, please contact support with your payment reference.</p>
          {reference ? (
            <p className="text-xs text-gray-400 mb-6 break-all">Reference: {reference}</p>
          ) : null}
          <div className="space-y-3">
            <Link
              href="/buyer-dashboard"
              className="block w-full py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="block w-full py-3 bg-white border border-gray-200 text-slate-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <Suspense fallback={
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-500">Loading payment status...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

