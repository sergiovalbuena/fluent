import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { GemsToastProvider } from '@/components/ui/gems-toast'
import { MariaWidget } from '@/components/maria/maria-widget'
import { IntlProvider } from '@/components/providers/intl-provider'
import { TopbarProvider } from '@/components/providers/topbar-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { getLanguageSettings } from '@/lib/active-language'
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

  const { languageCode, uiLocale, translationLang } = await getLanguageSettings()

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
    <LanguageProvider value={{ languageCode, translationLang }}>
    <TopbarProvider>
      <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#1b2030]">
        <SidebarNav modules={modules} />
        {/* Offset for sidebar on md+, bottom padding on mobile */}
        <div className="md:ml-[60px] pb-24 md:pb-0 min-h-screen">
          {children}
        </div>
        <BottomNav />
        <GemsToastProvider />
        <MariaWidget />
      </div>
    </TopbarProvider>
    </LanguageProvider>
    </IntlProvider>
  )
}
