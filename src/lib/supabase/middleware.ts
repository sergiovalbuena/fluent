import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims refreshes an expired session (writing the cookies above) and verifies
  // the token locally with the project's signing keys: no round trip to Supabase Auth.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims?.sub ? data.claims : null

  const { pathname } = request.nextUrl

  // Public routes: landing, auth flow and legal pages. API routes check auth
  // themselves and answer with JSON errors, so they're never redirected.
  const publicRoutes = [
    '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback',
    '/privacy-policy', '/terms', '/api',
  ]
  const isPublicRoute = pathname === '/' || publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
