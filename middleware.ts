import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if user has a state assigned
    if (!token?.state) {
      // Allow access to /select-state and the API route to update state
      if (path === '/select-state' || path.startsWith('/api/user/state')) {
        return NextResponse.next();
      }

      // Redirect all other dashboard routes to /select-state
      return NextResponse.redirect(new URL('/select-state', req.url));
    }

    // If user has a state, they can't go back to /select-state
    if (path === '/select-state') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
