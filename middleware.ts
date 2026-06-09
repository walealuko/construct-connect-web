import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { REDIRECT_MAP } from '@/lib/roles';

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

  // 1. Protected Routes (Require ANY logged-in user)
  const protectedRoutes = ['/profile', '/projects/post', '/cart', '/checkout'];
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Role-Based Protection
  const path = request.nextUrl.pathname;

  if (path.startsWith('/seller-dashboard') || path.startsWith('/admin-dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user?.id)
      .single();

    const role = profile?.tier;

    if (!user || (path.startsWith('/seller-dashboard') && role !== 'business') || (path.startsWith('/admin-dashboard') && role !== 'admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|marketplace|artisans|product).*)',
  ],
};
