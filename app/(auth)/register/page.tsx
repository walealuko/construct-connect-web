'use client';

import { useState, Suspense, useEffect, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { UserContext } from '@/components/UserContext';
import { getRedirectPath } from '@/lib/roles';
import { toast } from 'sonner';
import { registerSchema } from '@/lib/validations';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { registerUserAction } from '@/app/actions/auth';

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTier = searchParams.get('tier') === 'business' ? 'business' : 'individual';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    tier: defaultTier as 'individual' | 'business' | 'artisan',
    businessName: '',
    location: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      const result = await registerUserAction(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.session) {
        toast.success("Account created successfully!");
        const destination = getRedirectPath(result.tier);
        // The server action used the cookie-bound Supabase client to
        // call signInWithPassword, which set the auth cookies via
        // Set-Cookie response headers. The browser's Supabase client,
        // however, also stores the session in localStorage — and
        // localStorage was NOT touched by the server action. Without
        // a sync step, the dashboard's first render reads stale
        // localStorage (the previous "no session" state) and the
        // `AuthGuard` `getUser()` round-trip races with the new
        // cookies committing. In practice this can cause the
        // dashboard to bounce back to /login.
        //
        // The fix: ask the browser-side Supabase client to re-read
        // the session from the cookies BEFORE navigating. This
        // populates localStorage with the just-set session, so
        // INITIAL_SESSION fires with the user on the new page.
        // A microtask-flush via `setTimeout(0)` gives the cookie
        // store a tick to commit before we navigate.
        try {
          await supabase.auth.getSession();
        } catch {
          // If the read fails, the navigation will still happen;
          // the dashboard's getUser() will re-validate the cookies
          // with the Supabase server.
        }
        setTimeout(() => {
          window.location.replace(destination);
        }, 50);
      } else {
        // Either the project requires email confirmation OR the
        // auto-sign-in fallback failed. Either way, the user must
        // verify before they can reach the dashboard. The action's
        // optional `warning` carries the fallback's error message
        // (e.g. "Email not confirmed") — surface it so the user
        // understands why they didn't land on the dashboard.
        const warn = (result as { warning?: string }).warning;
        toast.info(
          warn
            ? `Account created. ${warn} Please verify your email to continue.`
            : "Please verify your email to continue.",
        );
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="text-gray-500 text-sm">Join the construction network</p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">I am a...</label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={formData.tier === 'individual' ? 'primary' : 'outline'}
                className="py-6 h-auto text-xs"
                onClick={() => setFormData({ ...formData, tier: 'individual' })}
              >
                Individual
              </Button>
              <Button
                type="button"
                variant={formData.tier === 'business' ? 'primary' : 'outline'}
                className="py-6 h-auto text-xs"
                onClick={() => setFormData({ ...formData, tier: 'business' })}
              >
                Business
              </Button>
              <Button
                type="button"
                variant={formData.tier === 'artisan' ? 'primary' : 'outline'}
                className="py-6 h-auto text-xs"
                onClick={() => setFormData({ ...formData, tier: 'artisan' })}
              >
                Artisan
              </Button>
            </div>
          </div>

          {(formData.tier === 'business' || formData.tier === 'artisan') && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g., Chidi Hotels Ltd"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Chidi"
              required
              autoComplete="given-name"
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Okonkwo"
              required
              autoComplete="family-name"
            />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="chidi@email.com"
            required
            autoComplete="email"
          />

          <Input
            label="Phone Number"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="08012345678"
            required
            autoComplete="tel"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location (State)</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select State</option>
              {NIGERIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full py-6 text-lg"
            disabled={loading}
            isLoading={loading}
          >
            Create Account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center py-6 border-t border-gray-50">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  // We render the registration form on the very first paint. The
  // session check below will swap in the "Switch Account"
  // interstitial on the next tick if the user is already signed in.
  // The one-frame flash of the form before the swap is a fair
  // trade-off for keeping this page usable without JS / before
  // hydration completes — the previous "show a spinner first"
  // approach left signed-out users staring at a spinner when JS
  // was slow to load.
  const [existingSession, setExistingSession] = useState<{ email: string; role: string } | null>(null);
  const userContext = useContext(UserContext);
  const logout = userContext?.logout;

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        setExistingSession({
          email: session.user.email ?? '',
          role: session.user.user_metadata?.tier || 'individual',
        });
      }
    };
    checkSession();
    return () => { cancelled = true; };
  }, []);

  // Sign out the existing session so the registration form becomes
  // usable. Same pattern as /login — hand off to UserContext.logout
  // which hard-navigates back to /register with cleared state.
  const switchAccount = async () => {
    if (!logout) {
      try { await supabase.auth.signOut(); } catch { /* network may be down */ }
      window.location.assign("/register");
      return;
    }
    await logout({ redirectTo: "/register" });
  };

  const continueAsCurrent = () => {
    const dest = getRedirectPath(existingSession?.role ?? 'individual');
    window.location.assign(dest);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-black text-blue-800 tracking-tight">
            Construct Hub
          </Link>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-2 rounded-full" />
        </div>
        {existingSession ? (
          // Same interstitial as /login, with copy aimed at "create a
          // new account" since that's the page's primary intent.
          <Card>
            <CardHeader className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Create a new account</h1>
              <p className="text-gray-500 text-sm">
                You're already signed in as{' '}
                <span className="font-semibold text-slate-700">{existingSession.email}</span>.
                Sign out first to register a different account.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                className="w-full py-6 text-base"
                onClick={switchAccount}
              >
                Sign out & create a new account
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full py-6 text-base"
                onClick={continueAsCurrent}
              >
                Keep my current account & go to dashboard
              </Button>
            </CardContent>
            <CardFooter className="text-center border-t border-gray-50 py-5">
              <p className="text-sm text-gray-600">
                Just need to sign in?{' '}
                <Link href="/login" className="text-blue-600 font-bold hover:underline">
                  Go to sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        ) : (
          <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading registration form...</div>}>
            <RegisterForm />
          </Suspense>
        )}
      </div>
    </div>
  );
}

