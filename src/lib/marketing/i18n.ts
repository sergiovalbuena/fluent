// Public marketing site (/en, /es): its own two locales, independent of the
// app's UI language. `/` is rewritten to one of them in the proxy.

export const SITE_LOCALES = ['es', 'en'] as const
export type SiteLocale = (typeof SITE_LOCALES)[number]
export const DEFAULT_SITE_LOCALE: SiteLocale = 'en'

/** Cookie set by the language switch, read by the proxy for `/` */
export const SITE_LOCALE_COOKIE = 'site_lang'

export const isSiteLocale = (value: string): value is SiteLocale =>
  (SITE_LOCALES as readonly string[]).includes(value)

/** Picks the locale for `/`: the saved choice, else the browser's languages */
export function negotiateSiteLocale(cookie: string | undefined, acceptLanguage: string | null): SiteLocale {
  if (cookie && isSiteLocale(cookie)) return cookie
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map(part => part.trim().slice(0, 2).toLowerCase())
    .find(isSiteLocale)
  return preferred ?? DEFAULT_SITE_LOCALE
}

/** Course pages: URL slug ↔ course language */
export const COURSE_SLUGS = { french: 'fr', english: 'en', spanish: 'es' } as const
export type CourseSlug = keyof typeof COURSE_SLUGS
export type CourseCode = (typeof COURSE_SLUGS)[CourseSlug]

export const isCourseSlug = (value: string): value is CourseSlug => value in COURSE_SLUGS

export const courseSlugFor = (code: CourseCode): CourseSlug =>
  (Object.keys(COURSE_SLUGS) as CourseSlug[]).find(slug => COURSE_SLUGS[slug] === code)!

/** Same page in the other locale, for the language switch and hreflang */
export function localizedPath(pathname: string, locale: SiteLocale): string {
  const rest = pathname.replace(/^\/(es|en)(?=\/|$)/, '')
  return `/${locale}${rest === '/' ? '' : rest}`
}
