import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LearnContent, type LearnModule } from '@/components/learn/learn-content'
import { getLanguageSettings } from '@/lib/active-language'
import { lessonDescription } from '@/lib/lesson-description'

const LANGUAGE_NAMES: Record<string, { name: string; flag: string }> = {
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  en: { name: 'English', flag: '🇺🇸' },
  de: { name: 'German', flag: '🇩🇪' },
  it: { name: 'Italian', flag: '🇮🇹' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
}

type ProgressRow = {
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

export default async function LearnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { uiLocale } = await getLanguageSettings()

  let languageCode = 'es'
  if (user) {
    const { data: activeLang, error: activeLangError } = await supabase
      .from('user_languages')
      .select('language_code')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    // No course chosen yet: onboarding sets it up
    if (!activeLang && !activeLangError) redirect('/onboarding')
    if (activeLang?.language_code) languageCode = activeLang.language_code
  }

  const { data } = await supabase
    .from('modules')
    .select('*, lessons(id)')
    .eq('language_code', languageCode)
    .eq('is_published', true)
    .order('order_index')

  const raw = data ?? []

  // Fetch user progress with gems_earned per completed lesson
  let progressData: ProgressRow[] = []
  if (user) {
    const { data: pd } = await supabase
      .from('user_progress')
      .select('module_id, stars, has_crown, gems_earned')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
    progressData = (pd ?? []) as ProgressRow[]
  }

  // Lessons unlocked early with gems, and the balance to unlock more
  let unlockedIds = new Set<string>()
  let gemBalance = 0
  if (user) {
    const [{ data: unlocked }, { data: profile }] = await Promise.all([
      supabase.from('user_unlocked_modules').select('module_id').eq('user_id', user.id),
      supabase.from('user_profiles').select('total_gems').eq('user_id', user.id).maybeSingle(),
    ])
    unlockedIds = new Set((unlocked ?? []).map(u => u.module_id as string))
    gemBalance = profile?.total_gems ?? 0
  }

  // Aggregate per module
  const moduleProgressMap = new Map<string, {
    completed: number
    minStars: number
    hasCrown: boolean
    gemsEarned: number
  }>()

  for (const row of progressData) {
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

  // Build modules with real progress
  const modulesBase = raw.map((m: {
    id: string; slug: string; title: string; icon: string; description: string | null; lessons: { id: string }[]
  }) => {
    const prog = moduleProgressMap.get(m.id)
    const totalLessons = m.lessons?.length ?? 0
    const lessonsCompleted = Math.min(prog?.completed ?? 0, totalLessons)
    const stars = computeModuleStars(lessonsCompleted, totalLessons, prog?.minStars ?? 0)
    const hasCrown = prog?.hasCrown ?? false
    const gemsEarned = prog?.gemsEarned ?? 0
    const progress = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0
    return { id: m.id, slug: m.slug, title: m.title, subtitle: lessonDescription(languageCode, m.slug, uiLocale, m.description) ?? undefined, icon: m.icon, totalLessons, lessonsCompleted, stars, hasCrown, gemsEarned, progress }
  })

  // The first module not completed yet is 'current' (lessons unlocked early with
  // gems may be completed out of order, so this can't be "after the last completed")
  const isDone = (m: { lessonsCompleted: number; totalLessons: number }) => m.totalLessons > 0 && m.lessonsCompleted >= m.totalLessons
  const currentIdx = modulesBase.findIndex(m => !isDone(m))

  const modules: LearnModule[] = modulesBase.map((m, i) => {
    let state: LearnModule['state']
    if (isDone(m)) {
      state = 'completed'
    } else if (i === currentIdx) {
      state = 'current'
    } else if (i === currentIdx + 1) {
      state = 'available'
    } else {
      state = unlockedIds.has(m.id) ? 'available' : 'locked'
    }
    return { ...m, state }
  })

  const lang = LANGUAGE_NAMES[languageCode] ?? { name: languageCode.toUpperCase(), flag: '🌐' }

  return (
    <LearnContent
      modules={modules}
      languageName={lang.name}
      languageFlag={lang.flag}
      gemBalance={gemBalance}
    />
  )
}
