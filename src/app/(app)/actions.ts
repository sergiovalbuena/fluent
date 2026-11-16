'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { LANGUAGES } from '@/lib/languages'
import { getAuthUser } from '@/lib/supabase/auth'
import { isOwner } from '@/lib/owner'
import { createAdminClient } from '@/lib/supabase/admin'

export async function setActiveLanguage(code: string) {
  if (!LANGUAGES.some(l => l.code === code)) throw new Error('Unknown language')

  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (!user) throw new Error('Not authenticated')

  const { data: language } = await supabase
    .from('languages')
    .select('is_available')
    .eq('code', code)
    .maybeSingle()
  if (!language?.is_available) throw new Error('Language not available')

  // Each account learns the course chosen at sign-up; only the owner switches freely
  if (!isOwner(user.id)) {
    const { data: own } = await supabase
      .from('user_languages')
      .select('is_unlocked')
      .eq('user_id', user.id)
      .eq('language_code', code)
      .maybeSingle()
    if (!own?.is_unlocked) throw new Error('Language locked')
  }

  await supabase.from('user_languages').update({ is_active: false }).eq('user_id', user.id)
  const { error } = await supabase.from('user_languages').upsert(
    { user_id: user.id, language_code: code, is_active: true, is_unlocked: true },
    { onConflict: 'user_id,language_code' },
  )
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
}

/**
 * Deletes the signed-in user's account and everything tied to it. Every user
 * table references auth.users with ON DELETE CASCADE, so removing the auth user
 * removes the profile, progress, gems, saved links, AI usage and group
 * membership. Irreversible.
 */
export async function deleteAccount(): Promise<{ ok: true } | { ok: false }> {
  const supabase = await createClient()
  // getUser() asks Supabase Auth (not just the token): this must be a live session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  // Leaving first hands a study group over to its next member; the cascade alone
  // would delete a group the user created, for everyone in it
  await supabase.rpc('leave_study_group')

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[deleteAccount] failed:', error.message)
    return { ok: false }
  }

  await supabase.auth.signOut()
  return { ok: true }
}

export async function setTranslationLanguage(code: string) {
  if (!LANGUAGES.some(l => l.code === code)) throw new Error('Unknown language')

  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('user_profiles')
    .update({ translation_language_code: code })
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
}
