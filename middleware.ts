import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // 1. Auth Routes - If logged in, redirect away from login/register to their dashboard
  if (path === '/login' || path === '/register') {
    if (user) {
      const role = user.user_metadata?.tier || 'individual'
      // Logic to map role to path
      const rolePaths: Record<string, string> = {
        admin: '/admin-dashboard',
        business: '/seller-dashboard',
        artisan: '/artisan-dashboard',
        individual: '/buyer-dashboard'
      }
      return NextResponse.redirect(new URL(rolePaths[role] || '/buyer-dashboard', request.url))
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
    const role = user.user_metadata?.tier || 'individual'

    if (path.startsWith('/seller-dashboard') && role !== 'business' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (path.startsWith('/artisan-dashboard') && role !== 'artisan' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (path.startsWith('/buyer-dashboard') && role !== 'individual' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (path.startsWith('/admin-dashboard') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
