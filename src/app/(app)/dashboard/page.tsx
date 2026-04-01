import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import type { LearnModule } from '@/components/learn/learn-content'

type ProgressRow = {
  completed_at: string
  score: number | null
  module_id: string
  stars: number
  has_crown: boolean
  gems_earned: number
}

function computeModuleStars(
  lessonsCompleted: number,
  totalLessons: number,
  minStars: number,
): 0 | 1 | 2 | 3 {
  if (lessonsCompleted === 0 || totalLessons === 0) return 0
  if (lessonsCompleted >= totalLessons && minStars >= 3) return 3
  if (lessonsCompleted >= totalLessons) return 2
  return 1
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const startOfWeekStr = (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
    return d.toISOString().split('T')[0]
  })()

  const [activeLangResult, profileResult, progressResult, activityResult] = await Promise.all([
    user
      ? supabase
          .from('user_languages')
          .select('language_code')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from('user_profiles')
          .select('streak_count, total_xp, display_name')
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from('user_progress')
          .select('completed_at, score, module_id, stars, has_crown, gems_earned')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from('user_activity')
          .select('activity_date, lessons_completed')
          .eq('user_id', user.id)
          .gte('activity_date', startOfWeekStr)
      : Promise.resolve({ data: [] }),
  ])

  const languageCode = activeLangResult.data?.language_code ?? 'es'
  const allProgress = (progressResult.data ?? []) as ProgressRow[]

  // ── Weekly activity from user_activity (1 session = 1 activity completed) ──
  const weekActivity = [0, 0, 0, 0, 0, 0, 0]
  const weekRows = (activityResult.data ?? []) as { activity_date: string; lessons_completed: number }[]
  weekRows.forEach((row) => {
    const d = new Date(row.activity_date + 'T00:00:00Z')
    const idx = (d.getUTCDay() + 6) % 7
    weekActivity[idx] += row.lessons_completed
  })

  const scores = allProgress
    .map(p => p.score)
    .filter((s): s is number => s !== null)
  const avgAccuracy = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null

  // ── Modules with full state ─────────────────────────────────────────────────
  const { data } = await supabase
    .from('modules')
    .select('*, lessons(id)')
    .eq('language_code', languageCode)
    .eq('is_published', true)
    .order('order_index')

  const raw = data ?? []

  // Aggregate progress per module
  const moduleProgressMap = new Map<string, {
    completed: number
    minStars: number
    hasCrown: boolean
    gemsEarned: number
  }>()

  for (const row of allProgress) {
    const existing = moduleProgressMap.get(row.module_id)
    if (existing) {
      existing.completed++
      existing.minStars = Math.min(existing.minStars, row.stars)
      existing.gemsEarned += row.gems_earned
      if (row.has_crown) existing.hasCrown = true
    } else {
      moduleProgressMap.set(row.module_id, {
        completed: 1,
        minStars: row.stars,
        hasCrown: row.has_crown,
        gemsEarned: row.gems_earned,
      })
    }
  }

  const modulesBase = raw.map((m: {
    id: string; slug: string; title: string; icon: string; lessons: { id: string }[]
  }) => {
    const prog = moduleProgressMap.get(m.id)
    const totalLessons = m.lessons?.length ?? 0
    const lessonsCompleted = Math.min(prog?.completed ?? 0, totalLessons)
    const stars = computeModuleStars(lessonsCompleted, totalLessons, prog?.minStars ?? 0)
    const hasCrown = prog?.hasCrown ?? false
    const gemsEarned = prog?.gemsEarned ?? 0
    const progress = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0
    return { id: m.id, slug: m.slug, title: m.title, icon: m.icon, totalLessons, lessonsCompleted, stars, hasCrown, gemsEarned, progress }
  })

  // Compute state (completed → current → available → locked)
  let lastCompletedIdx = -1
  for (let i = modulesBase.length - 1; i >= 0; i--) {
    const m = modulesBase[i]
    if (m.lessonsCompleted >= m.totalLessons && m.totalLessons > 0) {
      lastCompletedIdx = i
      break
    }
  }
  const currentIdx = lastCompletedIdx + 1

  const modules: LearnModule[] = modulesBase.map((m, i) => {
    let state: LearnModule['state']
    if (m.lessonsCompleted >= m.totalLessons && m.totalLessons > 0) {
      state = 'completed'
    } else if (i === currentIdx) {
      state = 'current'
    } else if (i === currentIdx + 1) {
      state = 'available'
    } else {
      state = 'locked'
    }
    return { ...m, state }
  })

  return (
    <DashboardContent
      modules={modules}
      displayName={profileResult.data?.display_name ?? user?.email?.split('@')[0] ?? 'there'}
      stats={{
        streak: profileResult.data?.streak_count ?? 0,
        totalXp: profileResult.data?.total_xp ?? 0,
        lessonsCompleted: allProgress.length,
        avgAccuracy,
        weekActivity: weekActivity,
      }}
    />
  )
}
