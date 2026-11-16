import type { SupabaseClient } from '@supabase/supabase-js'
import { browserTimeZone } from '@/lib/dates'

// The streak lives in the database: record_activity registers activity for the
// learner's local day, moves the streak (a missed day breaks it unless a streak
// freeze covers exactly one), and credits the 3 / 7 / 14-day bonus XP. Clients
// can't write the streak columns (trigger protect_streak). Every place that
// rewards practice calls this: lessons, mini-games, verbs, grammar, words mastered.

export type DayActivity = {
  streak: number
  /** First activity of the learner's day: the streak just moved */
  newDay: boolean
  /** A streak freeze was spent to cover one missed day */
  frozen: boolean
  /** Bonus XP the database already credited for a streak milestone */
  milestoneXp: number
}

const NOTHING: DayActivity = { streak: 0, newDay: false, frozen: false, milestoneXp: 0 }

export async function recordActivity(supabase: SupabaseClient): Promise<DayActivity> {
  const { data, error } = await supabase.rpc('record_activity', { p_tz: browserTimeZone() })
  if (error || !data) {
    if (error) console.error('[recordActivity] failed:', error.message)
    return NOTHING
  }
  const r = data as { streak: number; new_day: boolean; frozen: boolean; milestone_xp: number }
  return { streak: r.streak, newDay: r.new_day, frozen: r.frozen, milestoneXp: r.milestone_xp }
}
