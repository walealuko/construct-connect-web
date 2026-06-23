'use client';

import { useState, useEffect, useContext, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { UserContext } from '@/components/UserContext';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getRedirectPath } from '@/lib/roles';

// Open-redirect guard: the URL may carry ?redirect=<path> from the
// proxy/middleware when a protected page bounced an anonymous visitor.
// Only accept relative paths (start with `/`) that don't loop us back
// to an auth page.
function safeRedirectPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null; // refuse absolute URLs
  if (raw.startsWith("//")) return null; // refuse protocol-relative
  if (raw === "/login" || raw === "/register") return null;
  return raw;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = safeRedirectPath(searchParams.get("redirect"));
  // Forced sign-out: the proxy saw profiles.session_version ahead
  // of the JWT's embedded version, so it cleared our cookies and
  // redirected here. The banner explains why the form is empty
  // when the user expected to still be signed in.
  const forced = searchParams.get("reason") === "forced";
  const userContext = useContext(UserContext);
  const logout = userContext?.logout;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // `existingSession` is non-null when the user arrived at /login while
  // still signed in (cached session, idle timer about to fire, etc.).
  // Showing an interstitial gives them a choice instead of silently
  // bouncing them back to their dashboard.
  const [existingSession, setExistingSession] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        // Don't auto-redirect. Surface the "switch account" prompt so
        // the user can pick: continue as current user, or sign out
        // first to sign in as a different one.
        setExistingSession({
          email: session.user.email ?? '',
          role: session.user.user_metadata?.tier || 'individual',
        });
      }
    };
    checkSession();
    return () => { cancelled = true; };
    // Re-run if the user opens the page with a different ?redirect=.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, target]);

  // Sign out the existing session so the form below becomes usable.
  // We hand control to UserContext.logout, which clears supabase auth
  // storage, fires the SIGNED_OUT listener (deduped via redirectingRef),
  // and hard-navigates back to /login. The fresh page load renders the
  // empty form — exactly the "switch account" experience the user wants.
  const switchAccount = async () => {
    if (!logout) {
      // Defensive fallback if the context provider is missing for any
      // reason. Sweep tokens manually and reload.
      try {
        await supabase.auth.signOut();
      } catch { /* network may be down */ }
      window.location.assign("/login");
      return;
    }
    // Default redirectTo is "/login" — same page, fresh load. Pass
    // `redirectTo` explicitly so the forced nav lands somewhere usable
    // even if the user context's default changes in future.
    await logout({ redirectTo: "/login" });
  };

  const continueAsCurrent = () => {
    const dest = target ?? getRedirectPath(existingSession?.role ?? 'individual');
    // Use hard nav so we don't carry over any stale React state from
    // the auth form into the dashboard render.
    window.location.assign(dest);
  };

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        toast.error(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        toast.success("Welcome back!");
        const role = data.user.user_metadata?.tier || 'individual';
        const dest = target ?? getRedirectPath(role);
        router.replace(dest);
      }
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full space-y-8">
        {forced && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
            You've been signed out. Please sign in again to continue.
          </div>
        )}
        <div className="text-center">
          <Link href="/" className="text-3xl font-black text-blue-800 tracking-tight">
            Construct Hub
          </Link>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-2 rounded-full" />
        </div>

          {existingSession ? (
            // The user landed on /login while still holding a valid
            // session (cached token, other tab just signed in, etc.).
            // Rather than silently bounce them back to their dashboard,
            // we ask what they want — this is the "even if I have an
            // account on my cache" case the user asked us to handle.
            <Card>
              <CardHeader className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">You're already signed in</h1>
                <p className="text-gray-500 text-sm">
                  Signed in as <span className="font-semibold text-slate-700">{existingSession.email}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  className="w-full py-6 text-base"
                  onClick={continueAsCurrent}
                >
                  Continue to my dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6 text-base"
                  onClick={switchAccount}
                >
                  Sign out & use a different account
                </Button>
              </CardContent>
              <CardFooter className="text-center border-t border-gray-50 py-5">
                <p className="text-sm text-gray-600">
                  Need a new account?{' '}
                  <Link href="/register" className="text-blue-600 font-bold hover:underline">
                    Create one
                  </Link>
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
                <p className="text-gray-500 text-sm">Enter your details to access your account</p>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    className="w-full py-6 text-base"
                    disabled={loading}
                    isLoading={loading}
                  >
                    Sign In
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t border-gray-50 py-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-blue-600 font-bold hover:underline">Create one</Link>
                </p>
              </CardFooter>
            </Card>
          )}
        </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams() must be wrapped in a Suspense boundary for
  // static generation (Next.js requirement when pre-rendering
  // pages that read search params at build time).
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}

