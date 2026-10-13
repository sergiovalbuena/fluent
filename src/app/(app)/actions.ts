'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { LANGUAGES } from '@/lib/languages'

export async function setActiveLanguage(code: string) {
  if (!LANGUAGES.some(l => l.code === code)) throw new Error('Unknown language')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: language } = await supabase
    .from('languages')
    .select('is_available')
    .eq('code', code)
    .maybeSingle()
  if (!language?.is_available) throw new Error('Language not available')

  await supabase.from('user_languages').update({ is_active: false }).eq('user_id', user.id)
  const { error } = await supabase.from('user_languages').upsert(
    { user_id: user.id, language_code: code, is_active: true, is_unlocked: true },
    { onConflict: 'user_id,language_code' },
  )
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
}

export async function setTranslationLanguage(code: string) {
  if (!LANGUAGES.some(l => l.code === code)) throw new Error('Unknown language')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('user_profiles')
    .update({ translation_language_code: code })
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
}
