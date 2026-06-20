import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { User } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/lib/roles";
import { toast } from "sonner";
import AuthIdleTimer from "@/components/AuthIdleTimer";

interface LogoutOptions {
  /** Where to send the user after sign-out. Default: '/login'. */
  redirectTo?: string;
  /** When true, show a toast explaining the auto-logout. */
  reason?: "manual" | "idle";
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: (opts?: LogoutOptions) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Supabase stores its auth tokens under localStorage keys shaped like
// `sb-<project-ref>-auth-token`. We sweep them on sign-out so a stale
// token can't be reused on the next page load.
function clearSupabaseAuthStorage() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore — storage may be unavailable (private mode, etc.) */
  }
}

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Guard against multiple forced redirects firing from different code
  // paths (idle timer, expired token, onAuthStateChange SIGNED_OUT, etc.).
  // `window.location.assign` is itself a no-op if it interrupts an
  // in-flight navigation, but this also dedupes the toast and prevents
  // a redirect loop if the listener re-fires.
  const redirectingRef = useRef(false);

  const forceSignOut = useCallback(
    (opts: { redirectTo?: string; reason?: "manual" | "idle" | "expired" } = {}) => {
      if (redirectingRef.current) {
        // Already handling a sign-out — just clear state and bail.
        setUser(null);
        return;
      }
      redirectingRef.current = true;
      setUser(null);
      clearSupabaseAuthStorage();
      const dest = opts.redirectTo ?? "/login";
      if (opts.reason === "idle") {
        toast.message("You were signed out due to inactivity.");
      } else if (opts.reason === "expired") {
        toast.message("Your session expired. Please sign in again.");
      }
      // Hard navigation so the app starts from a clean slate — no stale
      // React tree, no router cache, no service worker state, no leftover
      // localStorage from the previous session.
      window.location.assign(dest);
    },
    []
  );

  useEffect(() => {
    // 1. Initial session check
    const initializeAuth = async () => {
      setLoading(true);
      console.log("[Auth] Initializing authentication...");

      // Create a timeout promise to prevent hanging
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth initialization timed out")), 5000)
      );

      try {
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeout]) as any;
        const { data: { session } } = result;

        if (!session) {
          console.log("[Auth] No session found.");
          setUser(null);
          setLoading(false);
          return;
        }

        const userPromise = supabase.auth.getUser();
        const userResult = await Promise.race([userPromise, timeout]) as any;
        const { data: { user: authUser }, error: authError } = userResult;

        if (authError) throw authError;

        if (authUser) {
          const role = authUser.user_metadata?.tier as UserRole || 'individual';
          console.log(`[Auth] User found: ${authUser.email} with role: ${role}`);
          setUser({
            id: authUser.id,
            email: authUser.email!,
            role: role
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("[Auth] Initialization error:", err);

        // If the token is expired or invalid, force a clean sign-out and
        // bounce to /login. This covers both an expired access token on
        // an active session and a tampered/refresh-failed case.
        if (err instanceof Error && (err.message.includes('token is expired') || err.message.includes('invalid JWT'))) {
          console.log("[Auth] Expired session detected. Forcing sign-out + reload.");
          // We wrap signOut in a try-catch because if the token is already
          // expired, the server-side logout call returns 403. We don't
          // care — forceSignOut will clear local storage and hard-navigate
          // regardless of the server response.
          supabase.auth.signOut().catch((logoutErr) => {
            if (logoutErr instanceof Error && logoutErr.message.includes("403")) {
              console.log("[Auth] Server logout failed as expected for expired token. Local cleanup complete.");
            } else {
              console.error("[Auth] Unexpected logout error:", logoutErr);
            }
          });
          forceSignOut({ reason: "expired" });
          return;
        }

        if (!(err instanceof Error) || !err.message.includes('Auth session missing')) {
          setUser(null);
        }
      } finally {
        setLoading(false);
        console.log("[Auth] Initialization complete.");
      }
    };

    initializeAuth();

    // 2. Listen for auth changes (sign-in, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // A new sign-in (possibly from another tab) — reset the redirect
        // guard so the user can sign out cleanly later.
        redirectingRef.current = false;
        const role = session.user.user_metadata?.tier as UserRole || 'individual';
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: role
        });
      } else if (event === 'SIGNED_OUT') {
        // Signed out from this tab, another tab, or by the server.
        // Wipe state and hard-navigate so the next page is rendered
        // from a clean slate (no router cache, no leftover memory).
        console.log("[Auth] SIGNED_OUT event received. Forcing app refresh.");
        forceSignOut({});
      } else if (event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        // These events mean the user is still signed in; just refresh
        // their profile so the UI reflects the new metadata.
        if (session?.user) {
          const role = session.user.user_metadata?.tier as UserRole || 'individual';
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: role
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [forceSignOut]);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        // A fresh sign-in cancels any pending redirect and allows the
        // user to sign out cleanly later.
        redirectingRef.current = false;
        setUser({
          id: data.user.id,
          email: data.user.email!,
          role: data.user.user_metadata?.tier || 'individual'
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = useCallback(async (opts: LogoutOptions = {}) => {
    // Reset the guard so a future sign-in/sign-out cycle works.
    redirectingRef.current = false;
    try {
      // Best-effort server-side sign-out. If the network call fails
      // (offline, expired token, etc.) we still clear local state and
      // redirect — the user shouldn't be stuck on a "logging out..." spinner.
      // The onAuthStateChange listener will receive SIGNED_OUT and call
      // forceSignOut, but we also call it directly here in case the
      // listener doesn't fire (e.g. no realtime connection).
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[Auth] signOut failed (continuing):", e);
    } finally {
      forceSignOut({
        redirectTo: opts.redirectTo,
        reason: opts.reason,
      });
    }
  }, [forceSignOut]);

  const refreshUser = async () => {
    setLoading(true);

    // Create a timeout promise to prevent hanging during refresh
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("User refresh timed out")), 5000)
    );

    try {
      const sessionPromise = supabase.auth.getSession();
      const sessionResult = await Promise.race([sessionPromise, timeout]) as any;
      const { data: { session } } = sessionResult;

      if (!session) {
        setUser(null);
        return;
      }

      const userPromise = supabase.auth.getUser();
      const userResult = await Promise.race([userPromise, timeout]) as any;
      const { data: { user: authUser } } = userResult;

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', authUser.id)
          .single();

        const role = profile?.tier || authUser.user_metadata?.tier || 'individual';

        setUser({
          id: authUser.id,
          email: authUser.email!,
          role: role as UserRole
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      if (!(err as any)?.message?.includes('Auth session missing')) {
        console.error("Error refreshing user:", err);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <UserContext.Provider value={{ user, setUser, loading, login, logout, refreshUser }}>
      {children}
      {user ? (
        <AuthIdleTimer
          idleMs={IDLE_TIMEOUT_MS}
          onTimeout={() => logout({ redirectTo: "/login", reason: "idle" })}
        />
      ) : null}
    </UserContext.Provider>
  );
};

