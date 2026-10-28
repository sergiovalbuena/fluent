import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-ui'
import { isSiteLocale, SITE_LOCALES } from '@/lib/marketing/i18n'

// Public marketing site: /es and /en. Static, no session needed.
export const dynamicParams = false

export function generateStaticParams() {
  return SITE_LOCALES.map(locale => ({ locale }))
}

export default async function MarketingLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()

  return (
    <div lang={locale} className="min-h-screen bg-[#f8f6f5] font-display text-slate-900 dark:bg-[#1b2030] dark:text-slate-100">
      <SiteHeader locale={locale} />
      <main>{children}</main>
      <SiteFooter locale={locale} />
    </div>
  )
}
