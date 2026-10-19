import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguageSettings } from '@/lib/active-language'
import { DashboardContent, type DashboardData } from '@/components/dashboard/dashboard-content'
import { getActiveBoosts } from '@/lib/rewards'
import { lessonStates } from '@/lib/course-path'
import { MASTERY, explanationLanguage, gemsLeft, loadGrammarIndex, type GrammarIndex } from '@/lib/grammar'
import { loadVerbExamples, loadVerbForms, loadVerbIndex, verbTranslation } from '@/lib/verbs'
import type { StudyGroup } from '@/lib/study-group'

// Everything the dashboard shows comes from here, in one round of queries.

type ProgressRow = { module_id: string }
type ModuleRow = { id: string; slug: string; title: string; icon: string; lessons: { id: string }[] }

const ymd = (d: Date) => d.toISOString().split('T')[0]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { languageCode: activeLanguage, translationLang } = await getLanguageSettings()

  const now = new Date()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
  const weekStart = ymd(monday)

  const [activeLang, profile, progress, activity, boosts, groupRes, savedRes, savedCount, unlocked] = await Promise.all([
    supabase.from('user_languages').select('language_code').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle(),
    supabase
      .from('user_profiles')
      .select('display_name, streak_count, longest_streak, last_activity_date, total_xp, total_gems, streak_freezes, daily_goal_minutes')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('user_progress').select('module_id').eq('user_id', user.id).not('completed_at', 'is', null),
    supabase.from('user_activity').select('activity_date, xp_earned, lessons_completed').eq('user_id', user.id).gte('activity_date', weekStart),
    getActiveBoosts(supabase, user.id),
    supabase.rpc('get_study_group'),
    supabase.from('study_links').select('title, thumbnail_url, platform').eq('language_code', activeLanguage).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('study_links').select('id', { count: 'exact', head: true }).eq('language_code', activeLanguage),
    supabase.from('user_unlocked_modules').select('module_id').eq('user_id', user.id),
  ])

  // No course chosen yet: onboarding sets it up
  if (!activeLang.data && !activeLang.error) redirect('/onboarding')
  const languageCode = activeLang.data?.language_code ?? activeLanguage
  const p = profile.data

  // ── Streak (0 if it has lapsed) and this week ──────────────────────────────
  const yesterday = ymd(new Date(now.getTime() - 86400000))
  const streakAlive = !!p?.last_activity_date && p.last_activity_date >= yesterday
  const weekXp = [0, 0, 0, 0, 0, 0, 0]
  const weekActive = [false, false, false, false, false, false, false]
  for (const row of (activity.data ?? []) as { activity_date: string; xp_earned: number; lessons_completed: number }[]) {
    const i = (new Date(row.activity_date + 'T00:00:00Z').getUTCDay() + 6) % 7
    weekXp[i] += row.xp_earned
    if (row.xp_earned > 0 || row.lessons_completed > 0) weekActive[i] = true
  }
  const todayIndex = (now.getUTCDay() + 6) % 7

  // ── Course path ─────────────────────────────────────────────────────────────
  const { data: modulesData } = await supabase
    .from('modules')
    .select('id, slug, title, icon, lessons(id)')
    .eq('language_code', languageCode)
    .eq('is_published', true)
    .order('order_index')
  const done = new Map<string, number>()
  for (const r of (progress.data ?? []) as ProgressRow[]) done.set(r.module_id, (done.get(r.module_id) ?? 0) + 1)
  const base = ((modulesData ?? []) as ModuleRow[]).map(m => {
    const totalLessons = m.lessons?.length ?? 0
    return { id: m.id, slug: m.slug, title: m.title, icon: m.icon, totalLessons, lessonsCompleted: Math.min(done.get(m.id) ?? 0, totalLessons) }
  })
  // Same states as the map in /learn
  const states = lessonStates(base, new Set(((unlocked.data ?? []) as { module_id: string }[]).map(u => u.module_id)))
  const modules = base.map((m, i) => ({
    slug: m.slug,
    title: m.title,
    icon: m.icon,
    progress: m.totalLessons ? Math.round((m.lessonsCompleted / m.totalLessons) * 100) : 0,
    state: states[i],
  }))
  const currentIndex = Math.max(states.indexOf('current'), 0)
  const pathStart = Math.max(Math.min(currentIndex - 1, modules.length - 7), 0)

  // ── Grammar: the module to work on next ────────────────────────────────────
  let grammar: DashboardData['grammar'] = null
  const grammarIndex: GrammarIndex | null = await loadGrammarIndex(languageCode, explanationLanguage(translationLang, user.id))
  if (grammarIndex) {
    const { data: rows } = await supabase.from('user_grammar_progress').select('module_slug, best').eq('language_code', languageCode)
    const best = new Map(((rows ?? []) as { module_slug: string; best: Record<string, number> }[]).map(r => [r.module_slug, r.best ?? {}]))
    const isMastered = (slug: string, ids: string[]) => ids.every(id => (best.get(slug)?.[id] ?? 0) >= MASTERY)
    const mastered = grammarIndex.modules.filter(m => isMastered(m.slug, m.exercises.map(e => e.id))).length
    const next =
      grammarIndex.modules.find(m => best.has(m.slug) && !isMastered(m.slug, m.exercises.map(e => e.id))) ??
      grammarIndex.modules.find(m => !isMastered(m.slug, m.exercises.map(e => e.id)))
    grammar = {
      mastered,
      total: grammarIndex.modules.length,
      next: next ? {
        slug: next.slug,
        number: next.number,
        title: next.title,
        tagline: next.tagline,
        exercises: next.exercises.map(e => (best.get(next.slug)?.[e.id] ?? -1) >= MASTERY),
        gems: gemsLeft(next.exercises.map(e => e.id), best.get(next.slug) ?? {}),
        started: best.has(next.slug),
      } : null,
    }
  }

  // ── Verb of the day: an essential verb, the same for everyone on a given day ──
  let verb: DashboardData['verb'] = null
  const verbIndex = await loadVerbIndex(languageCode)
  if (verbIndex) {
    const essentials = verbIndex.verbs.filter(v => v.essential)
    const day = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000)
    const v = essentials[day % essentials.length]
    const [forms, examples] = await Promise.all([loadVerbForms(languageCode), loadVerbExamples(languageCode)])
    const present = forms?.[v.id]?.PRESENT ?? forms?.[v.id]?.[verbIndex.moods[0].tenses[0].key]
    if (present) {
      const example = examples?.[v.id]?.PRESENT
      verb = {
        id: v.id,
        infinitive: v.infinitive,
        translation: verbTranslation(v, translationLang),
        aux: v.aux,
        tense: verbIndex.moods[0].tenses[0].name,
        forms: present.filter((f): f is string => !!f),
        example: example ? { text: example.text, translation: example.translations[translationLang] ?? example.translations.en ?? '', match: example.match } : null,
      }
    }
  }

  // ── Study group ─────────────────────────────────────────────────────────────
  const g = (groupRes.data as StudyGroup | null) ?? null
  const group: DashboardData['group'] = g ? {
    name: g.name,
    members: g.members.map(m => ({ id: m.user_id, name: m.name, avatar: m.avatar_url, weekXp: m.week_xp, isMe: m.is_me })),
  } : null

  const firstName = (p?.display_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '').split(' ')[0]

  const data: DashboardData = {
    languageCode,
    firstName,
    streak: streakAlive ? p?.streak_count ?? 0 : 0,
    longestStreak: p?.longest_streak ?? 0,
    freezes: p?.streak_freezes ?? 0,
    totalXp: p?.total_xp ?? 0,
    gems: p?.total_gems ?? 0,
    boosts: { xp: boosts.xp !== null, gems: boosts.gems !== null },
    dailyGoalMinutes: p?.daily_goal_minutes ?? 10,
    weekXp,
    weekActive,
    todayIndex,
    path: {
      total: modules.length,
      completed: modules.filter(m => m.state === 'completed').length,
      currentIndex,
      start: pathStart,
      modules: modules.slice(pathStart, pathStart + 7),
    },
    grammar,
    verb,
    group,
    saved: savedRes.data
      ? { count: savedCount.count ?? 1, title: savedRes.data.title, thumbnail: savedRes.data.thumbnail_url, platform: savedRes.data.platform }
      : null,
  }

  return <DashboardContent data={data} />
}
