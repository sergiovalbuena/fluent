import type { SupabaseClient } from '@supabase/supabase-js'

// Daily activity outside the lesson player (mini-games, verb and grammar practice,
// words mastered): adds the XP to today's user_activity row and keeps the streak,
// with the same rules as the lesson player — a missed day breaks it unless a streak
// freeze covers exactly one missed day. Dates are UTC, like the lesson player.

const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().split('T')[0]

export async function recordActivity(supabase: SupabaseClient, userId: string, xp: number): Promise<{ frozen: boolean }> {
  const today = day()

  const { data: existing } = await supabase
    .from('user_activity')
    .select('xp_earned')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .maybeSingle()
  await supabase.from('user_activity').upsert({
    user_id: userId,
    activity_date: today,
    xp_earned: (existing?.xp_earned ?? 0) + xp,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,activity_date' })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('streak_count, longest_streak, last_activity_date, streak_freezes')
    .eq('user_id', userId)
    .maybeSingle()
  if (!profile || profile.last_activity_date === today) return { frozen: false }

  const prev = profile.streak_count ?? 0
  const frozen = profile.last_activity_date === day(-2) && (profile.streak_freezes ?? 0) > 0
    ? (await supabase.rpc('use_streak_freeze')).data === true
    : false
  const continues = profile.last_activity_date === day(-1) || frozen
  const streak = continues || prev === 0 ? prev + 1 : 1

  await supabase.from('user_profiles').update({
    streak_count: streak,
    longest_streak: Math.max(streak, profile.longest_streak ?? 0),
    last_activity_date: today,
  }).eq('user_id', userId)

  return { frozen }
}
