"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState("verifying"); // verifying | success | error

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
          <Link
            href="/marketplace"
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✕</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h1>
          <p className="text-gray-500 mb-8">We couldn't verify your payment. Please contact support if you were charged.</p>
          <Link
            href="/marketplace"
            className="block w-full py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
          >
            Return to Marketplace
          </Link>
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

