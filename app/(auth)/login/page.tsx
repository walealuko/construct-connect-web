'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getRedirectPath } from '@/lib/roles';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
        router.replace('/dashboard');
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
      {authLoading ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Verifying session...</p>
        </div>
      ) : (
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="text-3xl font-black text-blue-800 tracking-tight">
              Construct Hub
            </Link>
            <div className="h-1 w-12 bg-blue-600 mx-auto mt-2 rounded-full" />
          </div>

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
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
        </div>
      )}
    </div>
  );
}

