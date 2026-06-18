import React, { createContext, useState, useEffect, useCallback } from "react";
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

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

        // If the token is expired or invalid, explicitly sign out to clear stale session
        if (err instanceof Error && (err.message.includes('token is expired') || err.message.includes('invalid JWT'))) {
          console.log("[Auth] Expired session detected. Clearing local session...");

          // We wrap signOut in a try-catch because if the token is already expired,
          // the server-side logout call will return a 403. We just want to clear local storage.
          supabase.auth.signOut().catch(logoutErr => {
            if (logoutErr instanceof Error && logoutErr.message.includes('403')) {
              console.log("[Auth] Server logout failed as expected for expired token. Local cleanup complete.");
            } else {
              console.error("[Auth] Unexpected logout error:", logoutErr);
            }
          });
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
        const role = session.user.user_metadata?.tier as UserRole || 'individual';
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: role
        });
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
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
    const dest = opts.redirectTo ?? "/login";
    try {
      // Best-effort server-side sign-out. If the network call fails
      // (offline, expired token, etc.) we still clear local state and
      // redirect — the user shouldn't be stuck on a "logging out..." spinner.
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[Auth] signOut failed (continuing):", e);
    } finally {
      setUser(null);
      if (opts.reason === "idle") {
        toast.message("You were signed out due to inactivity.");
      }
      // Hard navigation so middleware runs cleanly with no stale cookie.
      // `assign` and `href=` are equivalent; assign is the explicit form.
      window.location.assign(dest);
    }
  }, []);

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

