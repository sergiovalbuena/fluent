import { createClient } from '@/lib/supabase/server'
import { DashboardContent, type Module } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch language, profile, and progress in parallel
  const [activeLangResult, profileResult, progressResult] = await Promise.all([
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
          .select('completed_at, score')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const languageCode = activeLangResult.data?.language_code ?? 'es'

  // Compute weekly activity (Mon–Sun of current week)
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - ((dow + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)

  const weekActivity = [0, 0, 0, 0, 0, 0, 0]
  const allProgress = progressResult.data ?? []
  allProgress.forEach((p: { completed_at: string }) => {
    const d = new Date(p.completed_at)
    if (d >= startOfWeek) {
      const idx = (d.getDay() + 6) % 7 // Mon=0, Sun=6
      weekActivity[idx]++
    }
  })

  const scores = allProgress
    .map((p: { score: number | null }) => p.score)
    .filter((s): s is number => s !== null)
  const avgAccuracy = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null

  // Fetch modules (depends on languageCode)
  const { data } = await supabase
    .from('modules')
    .select('*, lessons(id)')
    .eq('language_code', languageCode)
    .eq('is_published', true)
    .order('order_index')

  const modules: Module[] = (data ?? []).map((m: {
    id: string
    slug: string
    title: string
    icon: string
    description?: string
    lessons: { id: string }[]
  }) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    icon: m.icon,
    description: m.description,
    totalLessons: m.lessons?.length ?? 0,
    completedLessons: 0,
    progress: 0,
  }))

  return (
    <DashboardContent
      modules={modules}
      displayName={profileResult.data?.display_name ?? user?.email?.split('@')[0] ?? 'there'}
      stats={{
        streak: profileResult.data?.streak_count ?? 0,
        totalXp: profileResult.data?.total_xp ?? 0,
        lessonsCompleted: allProgress.length,
        avgAccuracy,
        weekActivity,
      }}
    />
  )
}
