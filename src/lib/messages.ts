import type { AbstractIntlMessages } from 'next-intl'

/** Locales with app UI messages (messages/<code>.json) */
export const UI_LOCALES = ['en', 'es', 'fr', 'pt', 'de', 'it', 'ja'] as const

export const isUiLocale = (value: string): boolean => (UI_LOCALES as readonly string[]).includes(value)

/** UI messages for a locale (English when there are none for it) */
export async function getMessages(locale: string): Promise<AbstractIntlMessages> {
  const safeLocale = isUiLocale(locale) ? locale : 'en'
  try {
    const msgs = (await import(`../../messages/${safeLocale}.json`)) as { default: AbstractIntlMessages }
    return msgs.default
  } catch {
    const msgs = (await import('../../messages/en.json')) as { default: AbstractIntlMessages }
    return msgs.default
  }
}

/** First of the browser's languages the app has messages for, else English */
export function negotiateUiLocale(acceptLanguage: string | null): string {
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map(part => part.trim().slice(0, 2).toLowerCase())
    .find(isUiLocale)
  return preferred ?? 'en'
}
