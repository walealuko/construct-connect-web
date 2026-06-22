import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-12345',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()
  const path = url.pathname

  const rolePaths: Record<string, string> = {
    admin: '/admin-dashboard',
    business: '/seller-dashboard',
    artisan: '/artisan-dashboard',
    individual: '/',
  }

  const userRole = user?.user_metadata?.tier || 'individual'
  const correctPath = rolePaths[userRole] || '/'

  // 1. Auth Routes - If logged in, redirect away from login/register
  if (path === '/login' || path === '/register') {
    if (user) {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
  }

  // 2. Protected Routes — every route is protected except /login and
  //    /register. supabase.auth.getUser() validates the JWT against the
  //    Auth server, so a missing/expired/revoked token resolves to a
  //    null user and we bounce to /login with the original path so the
  //    user lands back here after sign-in.
  //
  //    API routes (/api/*) are excluded from the redirect so the
  //    route handler can return a proper 401/403 to the caller instead
  //    of dumping them on the HTML login page. The route handlers
  //    enforce their own auth checks via supabase.auth.getUser().
  const publicPaths = new Set(["/login", "/register"]);
  const isPublicRoute = publicPaths.has(path);
  const isApiRoute = path.startsWith("/api/");

  if (!isPublicRoute && !isApiRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    if (path !== "/") {
      loginUrl.searchParams.set("redirect", path + url.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Role-Based Access Control (RBAC)
  if (user) {
    // Redirect from the generic /dashboard to the role-specific path
    if (path === '/dashboard') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }

    // Prevent users from accessing other role dashboards. Admin can
    // see any dashboard for moderation purposes.
    if (path.startsWith('/seller-dashboard') && userRole !== 'business' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
    if (path.startsWith('/artisan-dashboard') && userRole !== 'artisan' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
    // /buyer-dashboard is reachable by any role that can place orders
    // (individual, business, artisan). Each of those roles may have
    // placed orders under their own buyer_id and needs to see their
    // purchase history. Sellers and artisans also have their own
    // role-specific dashboards for the seller-side view.
    if (
      path.startsWith('/buyer-dashboard') &&
      userRole !== 'individual' &&
      userRole !== 'business' &&
      userRole !== 'artisan' &&
      userRole !== 'admin'
    ) {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
    if (path.startsWith('/admin-dashboard') && userRole !== 'admin') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
