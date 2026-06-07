'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tier = (session?.user as any)?.tier || 'individual';
  const isBusiness = tier === 'business';

  const navItems = [
    { href: `/${tier}`, label: 'Overview', icon: '📊' },
    { href: `/${tier}/income`, label: 'Income', icon: '💰' },
    { href: `/${tier}/expenses`, label: 'Expenses', icon: '📤' },
    { href: `/${tier}/tax`, label: 'Tax Calculator', icon: '🧮' },
    { href: `/${tier}/forms`, label: 'My Forms', icon: '📄' },
  ];

  const userName = session?.user?.name || 'User';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-green-700 text-white rounded-lg"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b">
          <Link href="/" className="text-xl font-bold text-green-700">TaxHub</Link>
        </div>

        <div className="p-4 border-b">
          <div className="text-sm text-gray-500">Welcome back,</div>
          <div className="font-semibold text-gray-900">{userName}</div>
          <div className="text-xs text-green-600 mt-1 capitalize">{tier} Account</div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}