import type { SupabaseClient } from '@supabase/supabase-js'

// Study groups (/community). Everything goes through the database functions in
// supabase/migrations/20261018000002_study_groups.sql: members only see each
// other's name, avatar, course, streak and XP, and only within their own group.

export type GroupMember = {
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  is_me: boolean
  name: string
  avatar_url: string | null
  language_code: string | null
  streak: number
  active_today: boolean
  total_xp: number
  week_xp: number
  /** XP on each of the last 7 days, oldest first (today last) */
  days: number[]
}

export type StudyGroup = {
  id: string
  name: string
  invite_code: string
  created_at: string
  members: GroupMember[]
}

export type FeedEvent =
  | { user_id: string; at: string; kind: 'lesson'; data: { module_title: string; module_slug: string; language_code: string; activities: number; stars: number | null } }
  | { user_id: string; at: string; kind: 'grammar_module'; data: { module_slug: string } }
  | { user_id: string; at: string; kind: 'joined'; data: Record<string, never> }

export const GROUP_MAX_MEMBERS = 12
/** Weekly group goal: this much XP per member */
export const WEEKLY_XP_PER_MEMBER = 250

export type GroupError = 'invalid_code' | 'already_in_group' | 'group_full' | 'not_owner' | 'unknown'

function toError(message: string): GroupError {
  const known: GroupError[] = ['invalid_code', 'already_in_group', 'group_full', 'not_owner']
  return known.find(k => message.includes(k)) ?? 'unknown'
}

export async function getGroup(supabase: SupabaseClient): Promise<StudyGroup | null> {
  const { data, error } = await supabase.rpc('get_study_group')
  if (error) throw new Error(error.message)
  return (data as StudyGroup | null) ?? null
}

export async function getFeed(supabase: SupabaseClient, limit = 30): Promise<FeedEvent[]> {
  const { data, error } = await supabase.rpc('get_study_group_feed', { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data as FeedEvent[] | null) ?? []
}

type Result = { error: GroupError | null }

async function call(supabase: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<Result> {
  const { error } = await supabase.rpc(fn, args)
  return { error: error ? toError(error.message) : null }
}

export const createGroup = (s: SupabaseClient, name: string) => call(s, 'create_study_group', { p_name: name })
export const joinGroup = (s: SupabaseClient, code: string) => call(s, 'join_study_group', { p_code: code })
export const leaveGroup = (s: SupabaseClient) => call(s, 'leave_study_group')
export const renameGroup = (s: SupabaseClient, name: string) => call(s, 'rename_study_group', { p_name: name })
export const removeMember = (s: SupabaseClient, userId: string) => call(s, 'remove_study_group_member', { p_user: userId })
export const newInviteCode = (s: SupabaseClient) => call(s, 'regenerate_study_group_code')

/** Group goal for the week and how much of it is done */
export function weeklyGoal(group: StudyGroup): { goal: number; done: number } {
  return {
    goal: Math.max(group.members.length, 1) * WEEKLY_XP_PER_MEMBER,
    done: group.members.reduce((n, m) => n + m.week_xp, 0),
  }
}

/** Days left in the week (the week starts on Monday, like the weekly XP) */
export function daysLeftInWeek(now = new Date()): number {
  const day = now.getUTCDay() // 0 Sunday … 6 Saturday
  return day === 0 ? 1 : 8 - day
}

export const inviteLink = (code: string) =>
  typeof window === 'undefined' ? `/community?code=${code}` : `${window.location.origin}/community?code=${code}`
