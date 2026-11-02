import type { SupabaseClient } from '@supabase/supabase-js'
import { recordActivity } from '@/lib/activity'

// Gems are credited by the database (award_gems): it applies the 2× gems boost,
// caps each award and the daily total, and records the transaction. XP is computed
// by the client and added by the database (add_xp) in one statement, so awards that
// land at the same time (two tabs, a lesson and a mastered word…) are never lost.

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

/**
 * Adds XP to user_profiles.total_xp and to today's user_activity (xp_earned and,
 * with lessons = 1, lessons_completed) atomically. Returns the XP credited (0 on error).
 */
export async function addXp(supabase: SupabaseClient, xp: number, lessons: 0 | 1 = 0): Promise<number> {
  const amount = Math.max(0, Math.round(xp))
  if (amount === 0 && lessons === 0) return 0
  const { error } = await supabase.rpc('add_xp', { p_xp: amount, p_lessons: lessons })
  if (error) {
    console.error('[addXp]', error.message)
    return 0
  }
  return amount
}

/** Adds XP to the profile and today's activity (keeping the streak), and credits gems; returns what was actually awarded */
export async function addRewards(
  supabase: SupabaseClient,
  userId: string,
  { xp, gems, reason, ref }: { xp: number; gems: number; reason: GemReason; ref?: string },
): Promise<{ xp: number; gems: number }> {
  let creditedXp = 0
  if (xp > 0) {
    creditedXp = await addXp(supabase, xp)
    if (creditedXp > 0) await recordActivity(supabase, userId)
  }
  const credited = await awardGems(supabase, gems, reason, ref)
  return { xp: creditedXp, gems: credited }
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
