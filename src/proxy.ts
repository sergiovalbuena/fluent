import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Refreshes the Supabase session and sends signed-out visitors to /login
// (public routes are listed in updateSession)
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|txt|xml)$).*)'],
}
