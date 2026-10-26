import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguageSettings } from '@/lib/active-language'
import { courseLessonStates } from '@/lib/course-path-data'
import { getAuthUser } from '@/lib/supabase/auth'

// A locked lesson (and its activities, word sheet, flashcards…) can't be opened by
// URL or from a link elsewhere: back to the map, where it can be unlocked with gems.
// Slugs repeat across courses, so the state is the one in the active course.
export default async function LessonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (user) {
    const { languageCode } = await getLanguageSettings()
    const states = await courseLessonStates(user.id, languageCode)
    if (states.get(slug) === 'locked') redirect('/learn')
  }
  return children
}
