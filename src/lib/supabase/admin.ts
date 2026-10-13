import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Service role client — bypasses RLS. Use ONLY in server-side code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Server actions are public endpoints — the admin layout check does not protect them.
// Call this at the top of every admin server action instead of createAdminClient().
export async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) throw new Error('Not authorized')

  return createAdminClient()
}
