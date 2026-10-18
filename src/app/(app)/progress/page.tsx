import { createClient } from '@/lib/supabase/server'
import { getLanguageSettings } from '@/lib/active-language'
import { getCourseUnits } from '@/lib/course-units'
import { ProgressContent, type ProgressData } from '@/components/progress/progress-content'

/** Days shown in the activity heatmap (whole weeks, ending this week) */
const HEATMAP_WEEKS = 26

const toDateKey = (d: Date) => d.toISOString().slice(0, 10)

type ModuleRow = { id: string; slug: string; title: string; order_index: number; lessons: { id: string; type: string }[] }
type ProgressRow = {
  lesson_id: string
  module_id: string
  completed_at: string | null
  score: number | null
  stars: number | null
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { languageCode, uiLocale } = await getLanguageSettings()

  // Monday of the first heatmap week
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7) - (HEATMAP_WEEKS - 1) * 7)

  const [modulesRes, profileRes, progressRes, activityRes, masteryRes] = await Promise.all([
    supabase
      .from('modules')
      .select('id, slug, title, order_index, lessons(id, type)')
      .eq('language_code', languageCode)
      .eq('is_published', true)
      .order('order_index'),
    user
      ? supabase.from('user_profiles').select('streak_count, longest_streak, total_xp, total_gems, streak_freezes').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('user_progress').select('lesson_id, module_id, completed_at, score, stars').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('user_activity').select('activity_date, lessons_completed').eq('user_id', user.id).gte('activity_date', toDateKey(start))
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('user_vocab_mastery').select('word').eq('user_id', user.id).eq('language_code', languageCode)
      : Promise.resolve({ data: [] }),
  ])

  const modules = (modulesRes.data ?? []) as ModuleRow[]
  const profile = profileRes.data as {
    streak_count: number | null; longest_streak: number | null; total_xp: number | null
    total_gems: number | null; streak_freezes: number | null
  } | null

  // Only progress in this course counts
  const lessonType = new Map<string, string>()
  for (const m of modules) for (const l of m.lessons) lessonType.set(l.id, l.type)
  const progress = ((progressRes.data ?? []) as ProgressRow[]).filter(p => lessonType.has(p.lesson_id))
  const done = new Map(progress.filter(p => p.completed_at).map(p => [p.lesson_id, p]))

  // ── Course journey ──────────────────────────────────────────────────────────
  const moduleDone = modules.map(m => m.lessons.length > 0 && m.lessons.every(l => done.has(l.id)))
  const nextIdx = moduleDone.findIndex(d => !d)
  const next = nextIdx >= 0 ? modules[nextIdx] : null
  const units = getCourseUnits(languageCode, modules.length).map(u => ({
    emoji: u.emoji,
    title: u.translations[uiLocale] ?? u.title,
    total: u.to - u.from + 1,
    done: moduleDone.slice(u.from - 1, u.to).filter(Boolean).length,
  }))
  const totalActivities = lessonType.size
  const stars = [...done.values()].reduce((sum, p) => sum + (p.stars ?? 0), 0)

  // ── Skills: activities completed per type ───────────────────────────────────
  const skillTotals = new Map<string, { done: number; total: number }>()
  for (const [id, type] of lessonType) {
    const s = skillTotals.get(type) ?? { done: 0, total: 0 }
    s.total++
    if (done.has(id)) s.done++
    skillTotals.set(type, s)
  }

  // ── Heatmap ─────────────────────────────────────────────────────────────────
  const perDay = new Map<string, number>()
  for (const r of (activityRes.data ?? []) as { activity_date: string; lessons_completed: number | null }[]) {
    perDay.set(r.activity_date, (perDay.get(r.activity_date) ?? 0) + (r.lessons_completed ?? 0))
  }
  const days: { date: string; count: number; future: boolean }[] = []
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    days.push({ date: toDateKey(d), count: perDay.get(toDateKey(d)) ?? 0, future: d > today })
  }

  // ── Mastery ─────────────────────────────────────────────────────────────────
  let words = 0, phrases = 0, questions = 0
  for (const { word } of (masteryRes.data ?? []) as { word: string }[]) {
    if (word.startsWith('phrase:')) phrases++
    else if (word.startsWith('qa:')) questions++
    else words++
  }

  const scores = [...done.values()].map(p => p.score).filter((s): s is number => s !== null)

  const recent = [...done.values()]
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .slice(0, 6)
    .map(p => {
      const m = modules.find(mod => mod.id === p.module_id)
      return {
        id: p.lesson_id,
        type: lessonType.get(p.lesson_id) ?? '',
        moduleTitle: m?.title ?? '',
        slug: m?.slug ?? null,
        score: p.score,
        stars: p.stars ?? 0,
        completedAt: p.completed_at!,
      }
    })

  const data: ProgressData = {
    languageCode,
    streak: profile?.streak_count ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    freezes: profile?.streak_freezes ?? 0,
    totalXp: profile?.total_xp ?? 0,
    gems: profile?.total_gems ?? 0,
    accuracy: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    mastered: { words, phrases, questions },
    course: {
      modulesDone: moduleDone.filter(Boolean).length,
      modulesTotal: modules.length,
      activitiesDone: done.size,
      activitiesTotal: totalActivities,
      stars,
      next: next ? { slug: next.slug, title: next.title, position: nextIdx + 1 } : null,
      units,
    },
    skills: [...skillTotals.entries()].map(([type, s]) => ({ type, ...s })),
    days,
    recent,
  }

  return <ProgressContent data={data} />
}
