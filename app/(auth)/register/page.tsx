'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getRedirectPath } from '@/lib/roles';
import { toast } from 'sonner';
import { registerSchema } from '@/lib/validations';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Amachi", "Anambra", "Bauchi", "Bayelsa", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekidid", "Enugu", "Gombe", "Imbibi", "Imo", "Jigawa", "Kaduna", "Kano",
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
    businessType: '',
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

    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0].message;
      setError(firstError);
      toast.error(firstError);
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const user = authData.user;

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            tier: formData.tier,
            business_type: (formData.tier === 'business' || formData.tier === 'artisan') ? formData.businessType : null,
            business_name: (formData.tier === 'business' || formData.tier === 'artisan') ? formData.businessName : null,
            email: formData.email,
            location: formData.location,
          });

        if (profileError) throw profileError;

        await supabase.auth.updateUser({
          data: { tier: formData.tier }
        });
      }

      if (authData.session) {
        toast.success("Account created successfully!");
        const destination = getRedirectPath(formData.tier);
        window.location.href = destination;
      } else {
        toast.info("Please verify your email to continue.");
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-0">
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g., Chidi Hotels Ltd"
                required
              />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Type</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Select type</option>
                  <option value="sole_proprietor">Sole Proprietor</option>
                  <option value="company">Limited Liability Company</option>
                  <option value="partnership">Partnership</option>
                </select>
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
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Okonkwo"
              required
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
          />

          <Input
            label="Phone Number"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="08012345678"
            required
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
            />
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
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
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.tier || 'individual';
        const destination = getRedirectPath(role);
        router.replace(destination);
      } else {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-black text-blue-800 tracking-tight">
            Construct Hub
          </Link>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-2 rounded-full" />
        </div>
        <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading registration form...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
