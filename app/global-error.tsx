"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. The `app/error.tsx` boundary wraps route
 * segments and the root layout; this one catches anything that bubbles
 * past the root layout — typically CSS or HTML-level failures that
 * would otherwise render a blank page.
 *
 * Must include its own <html> and <body> because it replaces the
 * root layout when triggered. The design matches app/error.tsx so
 * the user gets the same recovery affordance regardless of which
 * boundary caught the error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-6 bg-white">
          <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl border border-gray-100 shadow-sm bg-gray-50">
            <div className="text-6xl mb-4">🚧</div>
            <h1 className="text-2xl font-black text-slate-900">Something went wrong</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              We encountered an unexpected error while loading the app. Please try again.
            </p>
            <div className="pt-4 space-y-3">
              <button
                onClick={() => reset()}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95"
              >
                Try again
              </button>
              <a
                href="/"
                className="block w-full py-3 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
