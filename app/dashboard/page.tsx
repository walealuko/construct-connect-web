"use client";

import { useContext, useEffect } from "react";
import { UserContext } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";

// Dispatcher that sends the signed-in user to the dashboard matching
// their role. Renders a skeleton while UserContext is still resolving
// the session, then navigates via useRouter once `user` is known.
//
// This file is a client component — `redirect()` from next/navigation
// is server-only in Next.js 16 and would throw if called here. The
// proxy also redirects /dashboard to the role-specific path, so this
// client-side effect is a belt-and-braces second layer that covers
// the case where the user lands here from a client-side navigation
// (Link / router.push) before the proxy re-runs.
export default function DashboardDispatcher() {
  const userContext = useContext(UserContext);
  const router = useRouter();

  const { user, loading } = userContext ?? { user: null, loading: true };

  useEffect(() => {
    if (loading || !user) return;
    switch (user.role) {
      case "admin":
        router.replace("/admin-dashboard");
        break;
      case "business":
        router.replace("/seller-dashboard");
        break;
      case "artisan":
        router.replace("/artisan-dashboard");
        break;
      default:
        // Individual users (and any unknown role) fall through to the
        // public home page. The proxy also redirects /dashboard to the
        // role-specific path, so non-individual users will normally be
        // moved before this effect fires — but we still need a default.
        router.replace("/");
        break;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // The effect above will navigate away; render an empty frame
  // while that round-trip is in flight so we never flash stale
  // content.
  return null;
}

