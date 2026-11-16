import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { COURSE_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/languages'
import { isOwner } from '@/lib/owner'
import type { UserProfile } from '@/lib/types/database'
import { getAuthUser } from '@/lib/supabase/auth'

export type LanguageSettings = {
  /** Language being learned */
  languageCode: string
  /** UI locale */
  uiLocale: string
  /** Language translations of lesson content are shown in */
  translationLang: string
  /** Courses the user may switch to: the one chosen at sign-up (every course for the owner) */
  unlockedLanguages: string[]
  /** The learner's time zone as last sent by their browser (null until their first activity) */
  timeZone: string | null
}

// Deduplicated per request — layout and pages can both call it.
export const getLanguageSettings = cache(async (): Promise<LanguageSettings> => {
  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)

  const settings: LanguageSettings = { languageCode: DEFAULT_LANGUAGE, uiLocale: 'en', translationLang: 'en', unlockedLanguages: [], timeZone: null }
  if (!user) return settings

  const [langData, profileData] = await Promise.all([
    supabase
      .from('user_languages')
      .select('language_code, is_active, is_unlocked')
      .eq('user_id', user.id),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const languages = langData.data ?? []
  const active = languages.find(l => l.is_active)
  if (active) settings.languageCode = active.language_code
  settings.unlockedLanguages = isOwner(user.id)
    ? COURSE_LANGUAGES
    : languages.filter(l => l.is_unlocked || l.is_active).map(l => l.language_code)
  // select('*') so this keeps working before the translation_language_code migration is applied
  const profile = profileData.data as Partial<UserProfile> | null
  if (profile?.app_language_code) settings.uiLocale = profile.app_language_code
  settings.translationLang = profile?.translation_language_code ?? settings.uiLocale
  settings.timeZone = profile?.timezone ?? null
  return settings
})
