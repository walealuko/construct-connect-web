'use client';

import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import { UserContext } from '@/components/UserContext';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="px-6 py-16 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Build Better, <br />
          <span className="text-blue-800">Source Smarter.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The ultimate marketplace for construction materials and expert artisans.
          Find everything you need for your building project in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/marketplace" className="px-8 py-4 bg-blue-800 text-white text-lg font-semibold rounded-lg hover:bg-blue-900">
            Explore Marketplace
          </Link>
          <Link href="/artisans" className="px-8 py-4 border-2 border-blue-800 text-blue-800 text-lg font-semibold rounded-lg hover:bg-blue-50">
            Find Artisans
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-12">Why Choose Construct Hub?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🏗️</div>
              <h3 className="font-semibold text-lg mb-2">Quality Materials</h3>
              <p className="text-gray-600 text-sm">Source verified construction materials from trusted suppliers.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🛠️</div>
              <h3 className="font-semibold text-lg mb-2">Expert Artisans</h3>
              <p className="text-gray-600 text-sm">Connect with skilled professionals for all your building needs.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">💳</div>
              <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
              <p className="text-gray-600 text-sm">Safe and transparent transactions for peace of mind.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t text-center text-gray-500 text-sm">
        <p>© 2024 Construct Hub. Building the future together.</p>
      </footer>
    </div>
  );
}

function IndividualHub() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome to Your Hub</h1>
          <p className="text-gray-500 text-lg font-medium">Where do you want to go today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/marketplace" className="group relative overflow-hidden rounded-3xl p-8 h-80 flex flex-col justify-end border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
            <div className="absolute top-0 right-0 p-6 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-300">🏗️S</div>
            <div className="relative z-10 space-y-2">
              <Badge variant="info" className="mb-2">Official Marketplace</Badge>
              <h3 className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">Seller Marketplace</h3>
              <p className="text-gray-500 max-w-xs text-sm">Buy high-quality construction materials and tools from verified business sellers.</p>
              <div className="pt-4 text-blue-600 font-bold text-sm flex items-center gap-2">
                Explore Materials <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
          </Link>

          <Link href="/artisans" className="group relative overflow-hidden rounded-3xl p-8 h-80 flex flex-col justify-end border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
            <div className="absolute top-0 right-0 p-6 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-300">🛠️A</div>
            <div className="relative z-10 space-y-2">
              <Badge variant="success" className="mb-2">Expert Network</Badge>
              <h3 className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">Artisan Marketplace</h3>
              <p className="text-gray-500 max-w-xs text-sm">Hire professional artisans and skilled laborers for your specific construction needs.</p>
              <div className="pt-4 text-blue-600 font-bold text-sm flex items-center gap-2">
                Find Experts <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
          </Link>
        </div>

        <div className="flex justify-center pt-6">
          <Button asChild variant="outline" className="px-8 py-6 text-base font-bold rounded-2xl">
            <Link href="/buyer-dashboard">My Account & Orders →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const userContext = useContext(UserContext);
  const router = useRouter();
  const { user, loading } = userContext || { user: null, loading: true };

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'business') {
        router.replace('/seller-dashboard');
      } else if (user.role === 'artisan') {
        router.replace('/artisan-dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="space-y-4 w-full max-w-md px-6">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (user && user.role === 'individual') {
    return <IndividualHub />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

