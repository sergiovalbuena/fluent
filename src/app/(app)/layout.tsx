import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { GemsToastProvider } from '@/components/ui/gems-toast'
import { IntlProvider } from '@/components/providers/intl-provider'
import { TopbarProvider } from '@/components/providers/topbar-provider'
import type { AbstractIntlMessages } from 'next-intl'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'de', 'it', 'ja']

async function getMessages(locale: string): Promise<AbstractIntlMessages> {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en'
  try {
    const msgs = (await import(`../../../messages/${safeLocale}.json`)) as { default: AbstractIntlMessages }
    return msgs.default
  } catch {
    const msgs = (await import('../../../messages/en.json')) as { default: AbstractIntlMessages }
    return msgs.default
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let languageCode = 'es'
  let uiLocale = 'en'

  if (user) {
    const [langData, profileData] = await Promise.all([
      supabase
        .from('user_languages')
        .select('language_code')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('app_language_code')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (langData.data?.language_code) languageCode = langData.data.language_code
    if (profileData.data?.app_language_code) uiLocale = profileData.data.app_language_code
  }

  const [modulesResult, messages] = await Promise.all([
    supabase
      .from('modules')
      .select('slug, title, icon')
      .eq('language_code', languageCode)
      .eq('is_published', true)
      .order('order_index'),
    getMessages(uiLocale),
  ])

  const modules = modulesResult.data ?? []

  return (
    <IntlProvider locale={uiLocale} messages={messages}>
    <TopbarProvider>
      <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
        <SidebarNav modules={modules} />
        {/* Offset for sidebar on md+, bottom padding on mobile */}
        <div className="md:ml-[60px] pb-24 md:pb-0 min-h-screen">
          {children}
        </div>
        <BottomNav />
        <GemsToastProvider />
      </div>
    </TopbarProvider>
    </IntlProvider>
  )
}
