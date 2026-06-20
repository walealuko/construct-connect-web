"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Public routes where auth verification should NOT redirect away.
// These are kept in sync with proxy.ts so the client guard never
// blocks the very pages a user needs to authenticate from.
const PUBLIC_PATHS = new Set(["/login", "/register"]);

/**
 * Re-runs `supabase.auth.getUser()` on every navigation. If the token
 * is invalid, expired, revoked, or missing, hard-navigates to
 * `/login?redirect=<currentPath>` so the user comes back here after
 * signing in.
 *
 * Server-side enforcement lives in `proxy.ts` — this is the
 * client-side counterpart that catches cases where the proxy didn't
 * run (cached navigations, prefetched routes, client-side router
 * transitions that skip the network round-trip).
 *
 * During verification, renders a spinner so protected content never
 * flashes for an unauthenticated visitor.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  // Track the last verified path so we don't re-verify the same path
  // twice in a row (e.g. on initial mount followed by a setReady flip).
  const lastVerifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      lastVerifiedRef.current = pathname;
      setReady(true);
      return;
    }

    if (lastVerifiedRef.current === pathname) {
      setReady(true);
      return;
    }

    setReady(false);
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;

        if (error || !data.user) {
          // Hard navigation so we wipe any cached state and the proxy
          // re-runs cleanly with no stale cookie.
          const target = new URL("/login", window.location.origin);
          target.searchParams.set("redirect", pathname);
          window.location.assign(target.toString());
          return;
        }

        lastVerifiedRef.current = pathname;
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        // Treat unexpected errors as a sign-out — fail closed.
        const target = new URL("/login", window.location.origin);
        target.searchParams.set("redirect", pathname);
        window.location.assign(target.toString());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!ready) {
    return (
      <div
        role="status"
        aria-label="Verifying session"
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  return <>{children}</>;
}