import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { lessonStates, type LessonState } from '@/lib/course-path'

type ModuleRow = { id: string; slug: string; lessons: { id: string }[] }

/**
 * Each lesson's state (slug → state) for a learner and a course, with the rule of /learn.
 * Cached per request: the app layout (sidebar) and the lesson layout (guard) both need it.
 */
export const courseLessonStates = cache(async (userId: string, languageCode: string): Promise<Map<string, LessonState>> => {
  const supabase = await createClient()
  const [{ data: modules }, { data: progress }, { data: unlocked }] = await Promise.all([
    supabase.from('modules').select('id, slug, lessons(id)').eq('language_code', languageCode).eq('is_published', true).order('order_index'),
    supabase.from('user_progress').select('module_id').eq('user_id', userId).not('completed_at', 'is', null),
    supabase.from('user_unlocked_modules').select('module_id').eq('user_id', userId),
  ])
  const done = new Map<string, number>()
  for (const r of (progress ?? []) as { module_id: string }[]) done.set(r.module_id, (done.get(r.module_id) ?? 0) + 1)
  const rows = ((modules ?? []) as ModuleRow[]).map(m => {
    const totalLessons = m.lessons?.length ?? 0
    return { id: m.id, slug: m.slug, totalLessons, lessonsCompleted: Math.min(done.get(m.id) ?? 0, totalLessons) }
  })
  const states = lessonStates(rows, new Set(((unlocked ?? []) as { module_id: string }[]).map(u => u.module_id)))
  return new Map(rows.map((r, i) => [r.slug, states[i]]))
})
