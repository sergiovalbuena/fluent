import type { MetadataRoute } from 'next'
import { COURSE_SLUGS, SITE_LOCALES } from '@/lib/marketing/i18n'
import { SITE_URL } from '@/lib/marketing/metadata'

// Public marketing pages, in both locales
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/grammar', '/verbs', '/maria', ...Object.keys(COURSE_SLUGS).map(slug => `/courses/${slug}`)]
  return paths.flatMap(path =>
    SITE_LOCALES.map(locale => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(SITE_LOCALES.map(l => [l, `${SITE_URL}/${l}${path}`])) },
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.8,
    })),
  )
}
