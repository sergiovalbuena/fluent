import { LESSON_TITLES } from '@/lib/lesson-titles'

/**
 * A lesson's description: its title in the learner's native language.
 * Lessons from the course files use those translations (English when the native
 * language isn't covered); older courses keep the description stored in the DB.
 * No description when the learner's native language is the course language.
 */
export function lessonDescription(courseLang: string, slug: string, nativeLang: string, stored: string | null): string | null {
  const titles = LESSON_TITLES[courseLang]?.[slug]
  if (!titles) return stored
  if (nativeLang === courseLang) return null
  return titles[nativeLang] ?? (courseLang !== 'en' ? titles.en ?? null : null)
}
