import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_LANGUAGE } from '@/lib/languages'
import type { UserProfile } from '@/lib/types/database'

export type LanguageSettings = {
  /** Language being learned */
  languageCode: string
  /** UI locale */
  uiLocale: string
  /** Language translations of lesson content are shown in */
  translationLang: string
}

// Deduplicated per request — layout and pages can both call it.
export const getLanguageSettings = cache(async (): Promise<LanguageSettings> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const settings: LanguageSettings = { languageCode: DEFAULT_LANGUAGE, uiLocale: 'en', translationLang: 'en' }
  if (!user) return settings

  const [langData, profileData] = await Promise.all([
    supabase
      .from('user_languages')
      .select('language_code')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (langData.data?.language_code) settings.languageCode = langData.data.language_code
  // select('*') so this keeps working before the translation_language_code migration is applied
  const profile = profileData.data as Partial<UserProfile> | null
  if (profile?.app_language_code) settings.uiLocale = profile.app_language_code
  settings.translationLang = profile?.translation_language_code ?? settings.uiLocale
  return settings
})
