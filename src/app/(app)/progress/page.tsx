import { createClient } from '@/lib/supabase/server'
import { ProgressContent } from '@/components/progress/progress-content'
import type { ProgressData, ProgressRow } from '@/components/progress/progress-content'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let streak        = 0
  let longestStreak = 0
  let totalXp       = 0
  let totalCompleted  = 0
  let avgScore      = 0
  let wordsLearned  = 0
  let dailyValues   = [0, 0, 0, 0, 0, 0, 0]
  let recentProgress: ProgressRow[] = []

  if (user) {
    const [profileResult, progressResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('streak_count, longest_streak, total_xp')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_progress')
        .select('lesson_id, completed_at, score, lesson:lessons(title, type, module:modules(title))')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false }),
    ])

    streak        = profileResult.data?.streak_count ?? 0
    longestStreak = profileResult.data?.longest_streak ?? 0
    totalXp       = profileResult.data?.total_xp ?? 0

    const allProgress = (progressResult.data ?? []) as unknown as ProgressRow[]
    recentProgress    = allProgress.slice(0, 10)
    totalCompleted    = allProgress.filter(p => p.completed_at !== null).length

    const scores = allProgress.filter(p => p.score !== null).map(p => p.score as number)
    avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    const vocabDone = allProgress.filter(p => p.lesson?.type === 'vocabulary' && p.completed_at).length
    wordsLearned = vocabDone * 8

    // Weekly activity (current week Mon–Sun)
    const today = new Date()
    const dow   = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - ((dow + 6) % 7))
    startOfWeek.setHours(0, 0, 0, 0)

    dailyValues = [0, 0, 0, 0, 0, 0, 0]
    allProgress.forEach(p => {
      if (!p.completed_at) return
      const d = new Date(p.completed_at)
      if (d >= startOfWeek) {
        const idx = (d.getDay() + 6) % 7
        dailyValues[idx]++
      }
    })
  }

  const data: ProgressData = {
    streak,
    longestStreak,
    totalXp,
    totalCompleted,
    avgScore,
    wordsLearned,
    dailyValues,
    recentProgress,
  }

  return <ProgressContent data={data} />
}
