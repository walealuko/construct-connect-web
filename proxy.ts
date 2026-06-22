import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { take } from '@/lib/rateLimit'

/**
 * Generate a short per-request id and forward it both upstream
 * (as `x-request-id`) and downstream (as a response header) so logs
 * from the proxy, the API route, and any server action can be
 * correlated by grep.
 */
function withRequestId(request: NextRequest): {
  requestId: string
  forwardedHeaders: Headers
} {
  const existing = request.headers.get('x-request-id')
  const requestId =
    existing && existing.length <= 64
      ? existing
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const forwardedHeaders = new Headers(request.headers)
  forwardedHeaders.set('x-request-id', requestId)
  return { requestId, forwardedHeaders }
}

/** Best-effort client IP for rate-limit bucketing. */
function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export async function proxy(request: NextRequest) {
  const { requestId, forwardedHeaders } = withRequestId(request)

  let response = NextResponse.next({
    request: {
      headers: forwardedHeaders,
    },
  })
  response.headers.set('x-request-id', requestId)

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
          // Reset response with the forwarded headers so the
          // x-request-id survives any auth-rotation Next does here.
          response = NextResponse.next({
            request: {
              headers: forwardedHeaders,
            },
          })
          response.headers.set('x-request-id', requestId)
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

  // 1. Auth Routes - /login and /register are public; they show their
  //    own "Switch Account" / "Sign out & create" interstitials when
  //    the visitor already has a session. We deliberately do NOT
  //    redirect signed-in users away here — that would silently
  //    bounce anyone trying to create a new account (or sign in as
  //    a different account) and leave them confused. The auth pages
  //    own the routing decision once we render them.

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

  // 1.5. Rate limits — applied BEFORE the auth redirect so an
  //      unauthenticated brute-force on /login or /register hits 429
  //      quickly instead of bouncing through a /login redirect that
  //      would itself count against the limit. The 5/min limit on
  //      auth is tight enough to block automated credential stuffing
  //      but loose enough that a user with fat-fingered credentials
  //      isn't punished.
  const ip = clientIp(request);
  if (path === '/login' || path === '/register') {
    if (!take(`auth:${ip}`, 5, 60_000)) {
      return new NextResponse('Too many requests. Try again in a minute.', {
        status: 429,
        headers: { 'x-request-id': requestId, 'retry-after': '60' },
      });
    }
  }
  if (path === '/api/payments/initialize' && request.method === 'POST') {
    if (!take(`pay:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'x-request-id': requestId, 'retry-after': '60' } }
      );
    }
  }

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
