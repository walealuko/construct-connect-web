'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
    tier: defaultTier as 'individual' | 'business',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const user = authData.user;

      if (user) {
        // 2. Create a profile record in the 'profiles' table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            tier: formData.tier,
            business_type: formData.tier === 'business' ? formData.businessType : null,
            business_name: formData.tier === 'business' ? formData.businessName : null,
            email: formData.email,
            location: formData.location,
          });

        if (profileError) throw profileError;
      }

      // Redirect based on tier and session status
      if (authData.session) {
        if (formData.tier === 'business') {
          router.push('/seller-dashboard');
        } else {
          router.push('/marketplace');
        }
      } else {
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold mb-2">Create your account</h1>
      <p className="text-gray-600 mb-6">Join the construction network</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tier Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tier: 'individual' })}
              className={`p-3 border-2 rounded-lg text-center font-medium transition-colors ${
                formData.tier === 'individual'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tier: 'business' })}
              className={`p-3 border-2 rounded-lg text-center font-medium transition-colors ${
                formData.tier === 'business'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Business
            </button>
          </div>
        </div>

        {/* Business fields */}
        {formData.tier === 'business' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g., Chidi Hotels Ltd"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full"
                required
              >
                <option value="">Select type</option>
                <option value="sole_proprietor">Sole Proprietor</option>
                <option value="company">Limited Liability Company</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Chidi"
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Okonkwo"
              required
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="chidi@email.com"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="08012345678"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location (State)</label>
          <select
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            className="w-full"
          >
            <option value="">Select State</option>
            {NIGERIAN_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            required
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-800 text-white font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-800 font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-800">Construct Hub</Link>
        </div>
        <Suspense fallback={<div>Loading registration form...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
