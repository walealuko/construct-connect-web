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

  // 2. Protected Routes - Must be logged in
  const protectedRoutes = [
    '/seller-dashboard',
    '/artisan-dashboard',
    '/buyer-dashboard',
    '/admin-dashboard',
    '/profile/edit',
    '/messages',
    '/projects/post',
    '/dashboard',
    '/checkout'
  ]
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Role-Based Access Control (RBAC)
  if (user) {
    // Redirect from the generic /dashboard to the role-specific path
    if (path === '/dashboard') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }

    // Prevent users from accessing other role dashboards
    if (path.startsWith('/seller-dashboard') && userRole !== 'business' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
    if (path.startsWith('/artisan-dashboard') && userRole !== 'artisan' && userRole !== 'admin') {
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
    if (path.startsWith('/buyer-dashboard') && userRole !== 'individual' && userRole !== 'admin') {
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
