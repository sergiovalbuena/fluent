import type { SupabaseClient } from '@supabase/supabase-js'
import { recordActivity } from '@/lib/activity'

// Gems are credited by the database (award_gems): it applies the 2× gems boost,
// caps each award and the daily total, and records the transaction. XP is still
// added by the client.

export type GemReason = 'lesson_activity' | 'minigame' | 'chest' | 'bonus'

/** Shop prices — keep in sync with public.buy_item */
export const PRICES = {
  xp_boost: 20,
  gems_boost: 25,
  streak_freeze: 30,
  unlock_module: 40,
} as const

export type ShopItem = keyof typeof PRICES

export const MAX_STREAK_FREEZES = 2
export const DAILY_GEM_CAP = 150

export async function awardGems(supabase: SupabaseClient, amount: number, reason: GemReason, ref?: string): Promise<number> {
  if (amount <= 0) return 0
  const { data, error } = await supabase.rpc('award_gems', { p_amount: amount, p_reason: reason, p_ref: ref ?? null })
  if (error) {
    console.error('[awardGems]', error.message)
    return 0
  }
  return typeof data === 'number' ? data : 0
}

/** Adds XP to the profile and today's activity (keeping the streak), and credits gems; returns what was actually awarded */
export async function addRewards(
  supabase: SupabaseClient,
  userId: string,
  { xp, gems, reason, ref }: { xp: number; gems: number; reason: GemReason; ref?: string },
): Promise<{ xp: number; gems: number }> {
  if (xp > 0) {
    const { data: profile } = await supabase.from('user_profiles').select('total_xp').eq('user_id', userId).maybeSingle()
    await supabase.from('user_profiles').update({ total_xp: (profile?.total_xp ?? 0) + xp }).eq('user_id', userId)
    await recordActivity(supabase, userId, xp)
  }
  const credited = await awardGems(supabase, gems, reason, ref)
  return { xp, gems: credited }
}

export type ActiveBoosts = { xp: number | null; gems: number | null }   // expiry timestamps (ms)

export async function getActiveBoosts(supabase: SupabaseClient, userId: string): Promise<ActiveBoosts> {
  const { data } = await supabase.from('user_boosts').select('boost, expires_at').eq('user_id', userId)
  const now = Date.now()
  const active: ActiveBoosts = { xp: null, gems: null }
  for (const row of (data ?? []) as { boost: 'xp' | 'gems'; expires_at: string }[]) {
    const t = new Date(row.expires_at).getTime()
    if (t > now) active[row.boost] = t
  }
  return active
}

/** Error codes raised by public.buy_item */
export type BuyError = 'insufficient_gems' | 'already_active' | 'max_freezes' | 'already_unlocked' | 'unknown'

export async function buyItem(supabase: SupabaseClient, item: ShopItem, ref?: string): Promise<{ balance: number } | { error: BuyError }> {
  const { data, error } = await supabase.rpc('buy_item', { p_item: item, p_ref: ref ?? null })
  if (error) {
    const known: BuyError[] = ['insufficient_gems', 'already_active', 'max_freezes', 'already_unlocked']
    return { error: known.find(k => error.message.includes(k)) ?? 'unknown' }
  }
  return { balance: data as number }
}
