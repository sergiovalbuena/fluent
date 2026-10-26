import type { SupabaseClient, UserMetadata } from '@supabase/supabase-js'

export type AuthUser = { id: string; email: string | null; user_metadata: UserMetadata }

/**
 * The signed-in user, read from the session token and verified here with the
 * project's signing keys (ES256, cached). Same shape as auth.getUser(), without
 * its round trip to Supabase Auth, which took 0.4–4 s per call and ran several
 * times per page. A session revoked elsewhere is noticed when its token expires
 * (1 h); admin checks keep using getUser().
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<{ data: { user: AuthUser | null } }> {
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return { data: { user: null } }
  return { data: { user: { id: claims.sub, email: claims.email ?? null, user_metadata: claims.user_metadata ?? {} } } }
}
