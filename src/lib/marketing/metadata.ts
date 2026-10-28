import type { Metadata } from 'next'
import { SITE_LOCALES, type SiteLocale } from './i18n'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fluent-xi.vercel.app'

/** Title, description, canonical URL and the hreflang pair for a marketing page (`path` without the locale) */
export function siteMetadata(locale: SiteLocale, path: string, title: string, description: string): Metadata {
  const url = `/${locale}${path}`
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(SITE_LOCALES.map(l => [l, `/${l}${path}`])),
        'x-default': `/en${path}`,
      },
    },
    openGraph: { title, description, url, siteName: 'Fluent', locale: locale === 'es' ? 'es_MX' : 'en_US', type: 'website' },
  }
}
