'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Routes that already render their own big in-page headline (e.g.
// "Seller Dashboard" + subtitle) directly below this breadcrumb. The
// breadcrumb would just repeat the page name with no added context,
// so it's hidden on these leaf pages only. Deeper routes under the
// dashboard (/orders/[id], /profile/edit, …) still render it.
const BREADCRUMB_HIDDEN_ROUTES = new Set<string>([
  "/seller-dashboard",
  "/artisan-dashboard",
  "/buyer-dashboard",
  "/admin-dashboard",
]);

const Breadcrumbs = () => {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment !== '');

  if (pathSegments.length === 0) return null;
  if (BREADCRUMB_HIDDEN_ROUTES.has(pathname)) return null;

  const crumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const isLast = index === pathSegments.length - 1;

    // Format segment: replace hyphens with spaces and capitalize
    const label = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-4">
      <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.href}>
          <span className="text-gray-300">/</span>
          {crumb.isLast ? (
            <span className="text-slate-900 font-bold">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
