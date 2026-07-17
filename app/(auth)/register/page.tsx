'use client';

import { useState, useRef, Suspense, useEffect, useContext, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { UserContext } from '@/components/UserContext';
import { getRedirectPath } from '@/lib/roles';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { registerUserAction } from '@/app/actions/auth';
import { PRODUCT_CATEGORIES } from '@/components/dashboard/ProductFormModal';
import { scorePassword } from '@/lib/validations';

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
    businessCategory: '',
    location: '',
  });
  const [error, setError] = useState('');
  // Field-level error from a Zod validation failure. Rendered
  // as a red border + inline message on the offending <Input>.
  // Distinct from `error` (the top-of-form banner) so a network
  // failure and a "Business name is required" don't fight for
  // the same slot — we only show one or the other.
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  // ?focus=email is set by the switchAccount handler in the
  // outer RegisterPage. When present, the form focuses the
  // email field on mount. We use a ref (not HTML `autoFocus`)
  // so fresh visitors don't get the mobile keyboard pop
  // automatically — the focus only fires when the user
  // explicitly requested it via the "Sign out & create" path.
  const focusEmailOnMount = searchParams.get("focus") === "email";
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Auto-focus the email field only when arriving via
  // `?focus=email` (set by the switchAccount handler in the
  // outer RegisterPage). requestAnimationFrame ensures the
  // <input> is mounted by the time we call .focus() — the
  // form has a non-trivial first paint and the input may not
  // be in the DOM yet on the synchronous render.
  useEffect(() => {
    if (!focusEmailOnMount) return;
    const id = requestAnimationFrame(() => {
      emailInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [focusEmailOnMount]);

  // When the user flips from a business/artisan tier to
  // individual, clear the business-only fields. The fields are
  // unmounted (the blue box is conditional on tier) so the
  // state would otherwise survive a round-trip back to a
  // business tier and surprise the user with a stale category.
  // We use a functional setState so a synchronous tier-button
  // click in the same render doesn't drop the clear.
  useEffect(() => {
    if (formData.tier === 'individual') {
      setFormData((prev) =>
        prev.businessName === '' && prev.businessCategory === ''
          ? prev
          : { ...prev, businessName: '', businessCategory: '' },
      );
    }
  }, [formData.tier]);

  // Live password strength score. The form's submit button is
  // gated on this — a score of 0 means the password fails the
  // Zod rule, and the user gets a friendly disabled button
  // instead of a server-roundtrip rejection. The score derives
  // from the same PASSWORD_MIN/PASSWORD_MAX/SPECIAL_CHARS
  // constants the server uses, so the form and the schema
  // can't drift apart.
  const passwordScore = useMemo(() => scorePassword(formData.password), [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError(null);

    setLoading(true);

    try {
      const result = await registerUserAction(formData);

      if (!result.success) {
        // Field-scoped error → highlight the offending input. The
        // banner stays empty so we don't show the same message
        // twice. If the action returned an error without a field
        // (network, auth, profile-upsert), fall through to the
        // generic banner.
        if (result.field) {
          setFieldError({ field: result.field, message: result.error });
        } else {
          setError(result.error);
        }
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
      // The Supabase auth client surfaces network failures as a
      // TypeError("Failed to fetch") — same shape as the
      // DNS-blocked / paused-project case from the original
      // browser error. Distinguish that from real auth/validation
      // errors so the user gets an actionable message instead of
      // a generic "Registration failed".
      if (
        err instanceof TypeError &&
        /Failed to fetch|NetworkError|Load failed/i.test(err.message)
      ) {
        const msg = "Can't reach the server. Check your connection — the project may be paused.";
        setError(msg);
        toast.error(msg);
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
        toast.error(err.message || 'Registration failed');
      }
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
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g., Chidi Hotels Ltd"
                required
                error={
                  fieldError?.field === "businessName" ? fieldError.message : undefined
                }
              />
              {/* "What do you sell?" — the seller-side equivalent
                  of business_name. Drives the artisan directory
                  filter on /artisans and pre-fills the product
                  modal on the seller-dashboard. Reuses
                  PRODUCT_CATEGORIES so the per-seller and
                  per-product vocabularies stay in sync.

                  "General" is the free pass for sellers who span
                  categories. We don't add a separate "Other" /
                  free-text option because the DB CHECK
                  (migration 0018) is a closed whitelist and a
                  free-text category would always silently
                  fail-closed at the database. */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-business-category"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  What do you sell?
                </label>
                <select
                  id="register-business-category"
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleChange}
                  required
                  aria-invalid={fieldError?.field === "businessCategory" || undefined}
                  className={`w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 ${
                    fieldError?.field === "businessCategory"
                      ? "border-red-500 focus:ring-red-600"
                      : "border-gray-300 focus:ring-blue-600"
                  }`}
                >
                  <option value="">Select a category</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {fieldError?.field === "businessCategory" && (
                  <p className="text-xs text-red-500 font-medium">{fieldError.message}</p>
                )}
              </div>
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
              error={fieldError?.field === "firstName" ? fieldError.message : undefined}
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Okonkwo"
              required
              autoComplete="family-name"
              error={fieldError?.field === "lastName" ? fieldError.message : undefined}
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
            ref={emailInputRef}
            error={fieldError?.field === "email" ? fieldError.message : undefined}
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
            error={fieldError?.field === "phone" ? fieldError.message : undefined}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location (State)</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              aria-invalid={fieldError?.field === "location" || undefined}
              className={`w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 ${
                fieldError?.field === "location"
                  ? "border-red-500 focus:ring-red-600"
                  : "border-gray-300 focus:ring-blue-600"
              }`}
            >
              <option value="">Select State</option>
              {NIGERIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {fieldError?.field === "location" && (
              <p className="text-xs text-red-500 font-medium">{fieldError.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="9–15 chars, with a special character"
                required
                autoComplete="new-password"
                error={fieldError?.field === "password" ? fieldError.message : undefined}
              />
              {/* Live strength meter. Renders nothing when the
                  field is empty (no point alarming a user who
                  hasn't started typing yet). The 3-segment bar
                  and color are driven by scorePassword() — same
                  scoring the Zod refine uses, so the meter and
                  the disabled-submit gate can't disagree. */}
              {formData.password.length > 0 && (
                <PasswordStrengthMeter score={passwordScore} />
              )}
            </div>
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              error={
                fieldError?.field === "confirmPassword" ? fieldError.message : undefined
              }
            />
          </div>

          <Button
            type="submit"
            className="w-full py-6 text-lg"
            disabled={loading || passwordScore === 0}
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

/**
 * 3-segment strength bar + label, driven by the score returned
 * by scorePassword() in lib/validations.ts. The score is the
 * single source of truth shared with the Zod refine, so the
 * meter and the disabled-submit check can never disagree.
 *
 * Colors are red/amber/green — accessible at the small sizes
 * the meter renders at, and aligned with the standard
 * weak/medium/strong convention users expect from signup forms.
 * The label is rendered for screen readers via aria-live so a
 * password-strength update is announced.
 */
function PasswordStrengthMeter({ score }: { score: 0 | 1 | 2 }) {
  const filled = score + 1; // 0 → 1, 1 → 2, 2 → 3 segments lit
  const labels = ["Weak", "Medium", "Strong"] as const;
  const colors = [
    "bg-red-500",
    "bg-amber-500",
    "bg-emerald-500",
  ] as const;
  const label = labels[score];
  const color = colors[score];

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < filled ? color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${
        score === 0 ? "text-red-600" : score === 1 ? "text-amber-600" : "text-emerald-600"
      }`}>
        Password strength: {label}
      </p>
    </div>
  );
}

export default function RegisterPage() {
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
  // The `?focus=email` param tells the form to auto-focus the
  // email input on mount, saving the user a tap.
  const switchAccount = async () => {
    if (!logout) {
      try { await supabase.auth.signOut(); } catch { /* network may be down */ }
      window.location.assign("/register?focus=email");
      return;
    }
    await logout({ redirectTo: "/register?focus=email" });
  };

  const continueAsCurrent = () => {
    const dest = getRedirectPath(existingSession?.role ?? 'individual');
    window.location.assign(dest);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <Link
            // When the user is already signed in (the "switch account"
            // interstitial is rendered), the wordmark should take them
            // to their actual dashboard — not the public landing page.
            // For fresh visitors, the landing page IS the right target.
            href={existingSession ? getRedirectPath(existingSession.role) : "/"}
            className="text-3xl font-black text-blue-800 tracking-tight"
          >
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

