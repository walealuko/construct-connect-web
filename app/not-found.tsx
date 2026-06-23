import Link from "next/link";

/**
 * 404 page. Server-rendered (no "use client") — no per-request state,
 * no event handlers, no reason to ship JS for it. The link uses
 * Next's client-side router for a fast back-to-home.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl border border-gray-100 shadow-sm bg-gray-50">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-black text-slate-900">Page not found</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="pt-4 space-y-3">
          <Link
            href="/"
            className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            Return to Home
          </Link>
          <Link
            href="/dashboard"
            className="block w-full py-3 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
