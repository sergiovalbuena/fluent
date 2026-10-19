import type { SupabaseClient } from '@supabase/supabase-js'
import { addRewards, awardGems, getActiveBoosts } from '@/lib/rewards'
import { REWARDS, applyXpMultipliers, exerciseReward, isModuleMastered, type XpMultipliers } from '@/lib/grammar'

// Credits a finished grammar round (rules in REWARDS, src/lib/grammar.ts) and
// returns what was actually credited, for the breakdown on the results screen.

export type GrammarRewardResult = {
  kind: 'first' | 'practice'
  baseXp: number
  xp: number
  multipliers: XpMultipliers
  /** Gems for mastering the exercise (credited, after the daily cap) */
  gems: number
  /** Gems the rules promised, to tell when the daily cap cut them */
  expectedGems: number
  /** The module became mastered with this round */
  moduleMastered: boolean
  moduleGems: number
}

export async function getXpMultipliers(supabase: SupabaseClient, userId: string): Promise<XpMultipliers> {
  const [{ data: profile }, boosts] = await Promise.all([
    supabase.from('user_profiles').select('streak_count').eq('user_id', userId).maybeSingle(),
    getActiveBoosts(supabase, userId),
  ])
  return { streak: profile?.streak_count ?? 0, boost: boosts.xp !== null }
}

export async function grantGrammarRewards(
  supabase: SupabaseClient,
  r: { slug: string; exId: string; pct: number; mixed: boolean; before: Record<string, number>; after: Record<string, number>; exerciseIds: string[] },
): Promise<GrammarRewardResult | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const userId = session.user.id

  const multipliers = await getXpMultipliers(supabase, userId)
  const reward = exerciseReward(r.before[r.exId], r.pct, r.mixed)
  const xp = applyXpMultipliers(reward.xp, multipliers)
  const credited = await addRewards(supabase, userId, { xp, gems: reward.gems, reason: 'lesson_activity', ref: `grammar:${r.slug}:${r.exId}` })

  const moduleMastered = !r.mixed && !isModuleMastered(r.exerciseIds, r.before) && isModuleMastered(r.exerciseIds, r.after)
  const moduleGems = moduleMastered ? await awardGems(supabase, REWARDS.moduleGems, 'bonus', `grammar-module:${r.slug}`) : 0

  return {
    kind: reward.kind,
    baseXp: reward.xp,
    xp: credited.xp,
    multipliers,
    gems: credited.gems,
    expectedGems: reward.gems + (moduleMastered ? REWARDS.moduleGems : 0),
    moduleMastered,
    moduleGems,
  }
}
