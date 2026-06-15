import React, { createContext, useState, useEffect } from "react";
import { User } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/lib/roles";

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial session check
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (authUser) {
          const role = authUser.user_metadata?.tier as UserRole || 'individual';
          setUser({
            id: authUser.id,
            email: authUser.email!,
            role: role
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        // Silently handle missing session errors during initialization
        if ((err as any)?.message?.includes('Auth session missing')) {
          setUser(null);
        } else {
          console.error("Auth initialization error:", err);
          setUser(null);
        }
      } finally {
        setLoading(false);
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
      } else if (event === 'SIGNED_OUT') {
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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
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
    </UserContext.Provider>
  );
};

