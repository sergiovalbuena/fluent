export type Language = {
  id: string
  code: string
  name: string
  native_name: string
  flag_emoji: string
  is_available: boolean
  created_at: string
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
  type: 'vocabulary' | 'phrases' | 'qa' | 'story'
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
  attempts: number
  created_at: string
  updated_at: string
}
