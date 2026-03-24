import { createAdminClient } from '@/lib/supabase/admin'
import { Users, BookOpen, Trophy, Zap, TrendingUp, Globe, Flame } from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`size-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default async function AdminOverviewPage() {
  const supabase = createAdminClient()

  // Stats
  const [
    { count: totalModules },
    { count: totalLessons },
    { count: totalCompletions },
    { data: profiles },
    { data: activityData },
  ] = await Promise.all([
    supabase.from('modules').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('user_progress').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    supabase.from('user_profiles').select('user_id, display_name, streak_count, total_xp, last_activity_date, created_at').order('created_at', { ascending: false }),
    supabase.from('user_activity').select('activity_date, xp_earned, lessons_completed').order('activity_date', { ascending: false }).limit(30),
  ])

  const profileList = profiles ?? []
  const totalUsers = profileList.length

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const activeThisWeek = profileList.filter(p =>
    p.last_activity_date && new Date(p.last_activity_date) >= sevenDaysAgo
  ).length

  const totalXp = profileList.reduce((sum, p) => sum + (p.total_xp ?? 0), 0)
  const topStreakers = profileList.filter(p => (p.streak_count ?? 0) > 0)
    .sort((a, b) => (b.streak_count ?? 0) - (a.streak_count ?? 0))
    .slice(0, 5)

  // Weekly XP chart data (last 7 days)
  const today = new Date()
  const weekXp: { date: string; label: string; xp: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayXp = (activityData ?? []).filter(a => a.activity_date === dateStr)
      .reduce((sum, a) => sum + (a.xp_earned ?? 0), 0)
    weekXp.push({ date: dateStr, label: d.toLocaleDateString('en', { weekday: 'short' }), xp: dayXp })
  }
  const maxXp = Math.max(...weekXp.map(d => d.xp), 1)

  // Recent sign-ups (last 5)
  const recentUsers = profileList.slice(0, 8)

  function relativeDate(date: string | null): string {
    if (!date) return 'Never'
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform health at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers} sub={`${activeThisWeek} active this week`} icon={Users} color="bg-blue-500" />
        <StatCard label="Completions" value={totalCompletions?.toLocaleString() ?? 0} sub="lessons finished" icon={Trophy} color="bg-emerald-500" />
        <StatCard label="Published Modules" value={totalModules ?? 0} sub={`${totalLessons ?? 0} lessons`} icon={BookOpen} color="bg-orange-500" />
        <StatCard label="Total XP Earned" value={totalXp.toLocaleString()} sub="across all users" icon={Zap} color="bg-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Activity chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">XP Earned — Last 7 Days</h3>
          </div>
          <div className="flex items-end gap-2 h-28">
            {weekXp.map(({ label, xp }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-orange-400 transition-all min-h-[4px]"
                  style={{ height: `${Math.max((xp / maxXp) * 100, xp > 0 ? 8 : 4)}%` }}
                />
                <span className="text-[10px] text-slate-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Streaks */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-orange-400" />
            <h3 className="text-sm font-semibold text-slate-700">Top Streaks</h3>
          </div>
          {topStreakers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No streak data yet</p>
          ) : (
            <div className="space-y-3">
              {topStreakers.map((p, i) => (
                <div key={p.user_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                  <div className="size-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-orange-600 font-bold text-xs">{(p.display_name ?? '?')[0].toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-slate-700 truncate flex-1">{p.display_name ?? 'User'}</p>
                  <div className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                    🔥 {p.streak_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent users */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Recent Users</h3>
          </div>
          <a href="/admin/users" className="text-xs text-orange-500 font-semibold hover:underline">View all →</a>
        </div>
        {recentUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No users yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentUsers.map(p => (
              <div key={p.user_id} className="flex items-center gap-3 px-5 py-3">
                <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-slate-500 font-bold text-xs">{(p.display_name ?? '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.display_name ?? 'Unnamed'}</p>
                  <p className="text-xs text-slate-400">Joined {relativeDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">🔥 {p.streak_count ?? 0}</span>
                  <span className="flex items-center gap-1">⚡ {p.total_xp ?? 0}</span>
                  <span className="text-slate-300">{relativeDate(p.last_activity_date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/modules', label: 'Manage Modules', icon: BookOpen, count: totalModules ?? 0 },
          { href: '/admin/languages', label: 'Languages', icon: Globe, count: 6 },
          { href: '/admin/users', label: 'All Users', icon: Users, count: totalUsers },
        ].map(({ href, label, icon: Icon, count }) => (
          <a key={href} href={href} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all group">
            <Icon size={20} className="text-slate-400 group-hover:text-orange-500 transition-colors mb-2" />
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{count}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
