export type Language = {
  id: string
  code: string
  name: string
  native_name: string
  flag_emoji: string
  is_available: boolean
  created_at: string
}

export type Skills = {
  speaking: number
  vocabulary: number
  listening: number
  grammar: number
}

export type UserProfile = {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  native_language_code: string | null
  streak_count: number
  longest_streak: number
  last_activity_date: string | null
  total_xp: number
  total_gems: number
  total_crowns: number
  daily_goal_minutes: number
  reminder_time: string
  motivation: string | null
  app_language_code: string
  notification_preference: string
  skills: Skills
  last_streak_milestone: number
  created_at: string
  updated_at: string
}

export type UserLanguage = {
  id: string
  user_id: string
  language_code: string
  is_active: boolean
  is_unlocked: boolean
  purchased_at: string | null
  created_at: string
}

export type Module = {
  id: string
  language_code: string
  title: string
  description: string | null
  icon: string
  icon_color: string
  order_index: number
  is_published: boolean
  created_at: string
}

export type Lesson = {
  id: string
  module_id: string
  type: 'vocabulary' | 'phrases' | 'qa' | 'story' | 'arrange' | 'translate'
  title: string
  order_index: number
  content: Record<string, unknown>
  is_published: boolean
  created_at: string
}

export type UserProgress = {
  id: string
  user_id: string
  lesson_id: string
  module_id: string
  completed_at: string | null
  score: number | null
  best_score: number
  attempts: number
  stars: number
  gems_earned: number
  has_crown: boolean
  activities_completed: string[]
  created_at: string
  updated_at: string
}

export type UserActivity = {
  user_id: string
  activity_date: string
  xp_earned: number
  lessons_completed: number
  minutes_spent: number
  updated_at: string
}

export type DailyMission = {
  id: string
  user_id: string
  mission_date: string
  mission_type: string
  description: string
  target_value: number
  current_value: number
  completed: boolean
  xp_reward: number
  gems_reward: number
  created_at: string
}
