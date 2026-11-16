import { cookies, headers } from 'next/headers'
import { getLanguageSettings } from '@/lib/active-language'
import { negotiateSiteLocale, SITE_LOCALE_COOKIE } from '@/lib/marketing/i18n'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'
import type { LegalLocale } from '@/lib/legal/content'

/**
 * Language of the legal pages: Spanish for a signed-in user whose app is in
 * Spanish, English for any other app language; signed out, the language picked
 * on the marketing site, else the browser's.
 */
export async function legalLocale(): Promise<LegalLocale> {
  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (user) return (await getLanguageSettings()).uiLocale === 'es' ? 'es' : 'en'
  const site = (await cookies()).get(SITE_LOCALE_COOKIE)?.value
  return negotiateSiteLocale(site, (await headers()).get('accept-language'))
}
