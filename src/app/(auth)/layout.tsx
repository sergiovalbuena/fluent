import { cookies, headers } from 'next/headers'
import type { AbstractIntlMessages } from 'next-intl'
import { IntlProvider } from '@/components/providers/intl-provider'
import { getLanguageSettings } from '@/lib/active-language'
import { getMessages, isUiLocale, negotiateUiLocale } from '@/lib/messages'
import { SITE_LOCALE_COOKIE } from '@/lib/marketing/i18n'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'

// Sign-in pages in the visitor's language: the profile's app language when there is
// a session (reset password), else the language picked on the marketing site, else
// the browser's.
async function authLocale(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (user) return (await getLanguageSettings()).uiLocale
  const site = (await cookies()).get(SITE_LOCALE_COOKIE)?.value
  if (site && isUiLocale(site)) return site
  return negotiateUiLocale((await headers()).get('accept-language'))
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await authLocale()
  const all = await getMessages(locale)
  const messages = { auth: all.auth } as AbstractIntlMessages

  return (
    <IntlProvider locale={locale} messages={messages} timeZone="UTC">
      <div lang={locale} className="min-h-screen flex items-center justify-center bg-[#f8f6f5] dark:bg-[#1b2030] p-4">
        {children}
      </div>
    </IntlProvider>
  )
}
