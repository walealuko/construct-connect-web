"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { usePathname } from "next/navigation";
import { UserContext } from "@/components/UserContext";
import { supabase } from "@/lib/supabase";

// Public routes where auth verification should NOT redirect away.
// These are kept in sync with proxy.ts so the client guard never
// blocks the very pages a user needs to authenticate from.
const PUBLIC_PATHS = new Set(["/login", "/register"]);

// Force a re-verification of the session token at most this often.
// Without this throttle, every Link/router.push to a protected page
// would fire a supabase.auth.getUser() round-trip and show a spinner
// in the meantime. Trusting the in-memory UserContext for short
// navigations keeps the app snappy; the long-term re-verify catches
// the case where the token expired in another tab.
const REVERIFY_AFTER_MS = 60_000;

/**
 * Re-runs `supabase.auth.getUser()` for protected pages when the
 * cached session is stale or missing. Hard-navigates to
 * `/login?redirect=<currentPath>` if the token is invalid, expired,
 * revoked, or missing.
 *
 * Server-side enforcement lives in `proxy.ts` — this is the
 * client-side counterpart that catches cases where the proxy didn't
 * run (cached navigations, prefetched routes, client-side router
 * transitions that skip the network round-trip).
 *
 * Public paths (/login, /register) are passed through on the very
 * first render so the SSR HTML contains the actual page content
 * rather than a spinner. The protected-path check only kicks in
 * after the effect runs, which only happens on the client.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userContext = useContext(UserContext);

  // Public paths render children immediately. The pathname is known
  // synchronously from the URL, so we don't need an effect to
  // determine whether to gate the render. This is what lets the
  // /login and /register pages render in the SSR HTML — without
  // this, every auth page would just be a spinner until hydration.
  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false;

  // Protected paths default to NOT ready on first render. The effect
  // flips this to true after we confirm the user has a valid session.
  // Public paths default to ready so the children render in the
  // initial paint.
  const [ready, setReady] = useState(isPublic);
  // Track the last verified path so we don't re-verify the same path
  // twice in a row (e.g. on initial mount followed by a setReady flip).
  const lastVerifiedRef = useRef<string | null>(null);
  // Track the last timestamp we ran a full supabase.auth.getUser()
  // round-trip, so back-to-back navigations only pay the network cost
  // once per REVERIFY_AFTER_MS.
  const lastReverifyAtRef = useRef<number>(0);

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      lastVerifiedRef.current = pathname;
      setReady(true);
      return;
    }

    // If the in-memory user is known and we've verified the session
    // recently, skip the network round-trip entirely. This is the
    // common case for short navigations between protected pages.
    if (
      userContext &&
      !userContext.loading &&
      userContext.user &&
      lastVerifiedRef.current === pathname &&
      Date.now() - lastReverifyAtRef.current < REVERIFY_AFTER_MS
    ) {
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

        lastReverifyAtRef.current = Date.now();
        lastVerifiedRef.current = pathname;
        setReady(true);
      } catch {
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
  }, [pathname, userContext]);

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