import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { REDIRECT_MAP, getRedirectPath } from '@/lib/roles';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-12345',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 1. Redirect authenticated users away from Auth pages
  if (user && (path === '/login' || path === '/register')) {
    const role = user.user_metadata?.tier || 'individual';
    const redirectPath = getRedirectPath(role);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // 2. Protected Routes (Require ANY logged-in user)
  const protectedRoutes = ['/profile', '/projects/post', '/checkout'];
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Role-Based Protection
  if (path.startsWith('/seller-dashboard') || path.startsWith('/admin-dashboard')) {
    const role = user?.user_metadata?.tier;

    if (!user || (path.startsWith('/seller-dashboard') && role !== 'business') || (path.startsWith('/admin-dashboard') && role !== 'admin')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|marketplace|artisans|product).*)',
  ],
};
