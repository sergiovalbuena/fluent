import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { negotiateSiteLocale, SITE_LOCALE_COOKIE } from '@/lib/marketing/i18n'

// Refreshes the Supabase session and sends signed-out visitors to /login
// (public routes are listed in updateSession). `/` shows the marketing home
// in the visitor's language (/es or /en) without changing the URL.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const locale = negotiateSiteLocale(
      request.cookies.get(SITE_LOCALE_COOKIE)?.value,
      request.headers.get('accept-language'),
    )
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.rewrite(url, { headers: { Vary: 'Accept-Language, Cookie' } })
  }
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|txt|xml)$).*)'],
}
