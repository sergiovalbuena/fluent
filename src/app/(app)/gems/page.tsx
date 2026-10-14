import { createClient } from '@/lib/supabase/server'
import { getLanguageSettings } from '@/lib/active-language'
import { GemsPageContent, type GemTransaction, type DailyTip } from '@/components/gems/gems-content'

type TipRow = {
  tips: Record<string, string>[] | null
  modules: { title: string; order_index: number; slug: string } | null
}

export default async function GemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { languageCode, translationLang } = await getLanguageSettings()

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const [profileRes, boostsRes, historyRes, todayRes, tipsRes] = await Promise.all([
    user
      ? supabase.from('user_profiles').select('total_gems, streak_freezes').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('user_boosts').select('boost, expires_at').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('gem_transactions').select('id, amount, reason, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(15)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('gem_transactions').select('amount').eq('user_id', user.id).gt('amount', 0)
          .gte('created_at', startOfDay.toISOString())
      : Promise.resolve({ data: [] }),
    // Tips stored with each lesson's vocabulary, for the tip of the day
    supabase.from('lessons')
      .select('tips:content->tips, modules!inner(title, order_index, slug, language_code)')
      .eq('type', 'vocabulary')
      .eq('modules.language_code', languageCode),
  ])

  const boosts: Record<string, number> = {}
  for (const b of (boostsRes.data ?? []) as { boost: string; expires_at: string }[]) {
    boosts[b.boost] = new Date(b.expires_at).getTime()
  }

  // Same tip all day, a different one each day
  const allTips = ((tipsRes.data ?? []) as unknown as TipRow[])
    .flatMap(row => (row.tips ?? []).map(tip => ({ tip, module: row.modules })))
    .filter(x => x.module)
  // Server component: rendered once per request
  // eslint-disable-next-line react-hooks/purity
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  const pick = allTips.length > 0 ? allTips[dayIndex % allTips.length] : null
  const dailyTip: DailyTip | null = pick && pick.module
    ? {
        text: pick.tip[translationLang] ?? pick.tip.en ?? '',
        lessonNumber: pick.module.order_index,
        lessonTitle: pick.module.title,
        slug: pick.module.slug,
      }
    : null

  return (
    <GemsPageContent
      signedIn={!!user}
      totalGems={profileRes.data?.total_gems ?? 0}
      streakFreezes={profileRes.data?.streak_freezes ?? 0}
      boosts={boosts}
      earnedToday={((todayRes.data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0)}
      history={(historyRes.data ?? []) as GemTransaction[]}
      dailyTip={dailyTip?.text ? dailyTip : null}
    />
  )
}
