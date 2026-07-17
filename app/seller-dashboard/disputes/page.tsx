"use client";

// Placeholder for the per-seller disputes listing. The dashboard
// widget at /seller-dashboard links here; the full per-seller
// listing is a follow-up. This page renders the same open
// disputes count as the widget so a seller who clicks through
// doesn't get a 404 — they get a "we know there's N to look at,
// the full UI is on its way" page.

import { useContext, useEffect, useState } from "react";
import { UserContext } from "@/components/UserContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { listMyOpenDisputesAction } from "@/app/actions/disputes";
import Link from "next/link";

export default function SellerDisputesPage() {
  const userContext = useContext(UserContext);
  const { user, loading: authLoading } = userContext || {
    user: null,
    loading: true,
  };

  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listMyOpenDisputesAction();
      if (cancelled) return;
      if (result.success) {
        setCount(result.count);
      } else {
        setError(result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (authLoading) {
    return (
      <DashboardLayout userRole="business">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="business">
      <div className="space-y-6 max-w-3xl">
        <Link
          href="/seller-dashboard"
          className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-700 transition-colors"
        >
          ← Back to Dashboard
        </Link>

        <div>
          <h2 className="text-3xl font-black text-slate-900">Open Disputes</h2>
          <p className="text-gray-500 font-medium">
            Orders currently in dispute. The full per-seller listing is on the
            way; for now, open each order from the table below to follow up.
          </p>
        </div>

        <Card>
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <h3 className="text-lg font-bold text-slate-800">Coming soon</h3>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {error ? (
              <p className="text-sm text-red-600">
                Failed to load the dispute count: {error}
              </p>
            ) : count === null ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <>
                <p className="text-base text-slate-800">
                  You currently have{" "}
                  <span
                    className={`font-black ${
                      count > 0 ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {count}
                  </span>{" "}
                  {count === 1 ? "order" : "orders"} in dispute.
                </p>
                <p className="text-sm text-gray-500">
                  Disputed rows are tinted on the dashboard's Recent Orders
                  table. Open one to follow up with the buyer or seller.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
