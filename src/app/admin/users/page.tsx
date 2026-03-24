import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Users, Zap, Gem, Flame } from 'lucide-react'

type ProfileRow = {
  user_id: string
  display_name: string | null
  streak_count: number
  total_xp: number
  total_gems: number
  total_crowns: number
  last_activity_date: string | null
  created_at: string
  is_admin: boolean
}

function relativeDate(date: string | null): string {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function toggleAdmin(userId: string, current: boolean) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('user_profiles').update({ is_admin: !current }).eq('user_id', userId)
  revalidatePath('/admin/users')
}

export default async function UsersPage() {
  const supabase = createAdminClient()

  const [{ data: profiles }, authResult] = await Promise.all([
    supabase.from('user_profiles')
      .select('user_id, display_name, streak_count, total_xp, total_gems, total_crowns, last_activity_date, created_at, is_admin')
      .order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profileList = (profiles ?? []) as ProfileRow[]
  const authUsers = authResult.data?.users ?? []
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const activeThisWeek = profileList.filter(p =>
    p.last_activity_date && new Date(p.last_activity_date) >= sevenDaysAgo
  ).length

  const avgXp = profileList.length > 0
    ? Math.round(profileList.reduce((s, p) => s + (p.total_xp ?? 0), 0) / profileList.length)
    : 0

  const totalGems = profileList.reduce((s, p) => s + (p.total_gems ?? 0), 0)

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">{profileList.length} registered users</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: profileList.length, icon: Users, color: 'bg-blue-500' },
          { label: 'Active This Week', value: activeThisWeek, icon: Flame, color: 'bg-orange-500' },
          { label: 'Avg XP', value: avgXp.toLocaleString(), icon: Zap, color: 'bg-violet-500' },
          { label: 'Total Gems', value: totalGems.toLocaleString(), icon: Gem, color: 'bg-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`size-9 rounded-lg flex items-center justify-center ${color} shrink-0`}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {profileList.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No users yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['User', 'Streak', 'XP', 'Gems', 'Crowns', 'Last Active', 'Joined', 'Admin'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profileList.map(p => {
                  const email = emailMap.get(p.user_id) ?? ''
                  const initials = (p.display_name ?? email)[0]?.toUpperCase() ?? '?'
                  return (
                    <tr key={p.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate max-w-[120px]">{p.display_name ?? 'Unnamed'}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[120px]">{email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-orange-500 font-semibold text-xs">
                          🔥 {p.streak_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700 font-medium">{(p.total_xp ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 tabular-nums text-amber-600 font-medium">{p.total_gems ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        {(p.total_crowns ?? 0) > 0
                          ? <span className="text-sm">👑 {p.total_crowns}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{relativeDate(p.last_activity_date)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <form action={toggleAdmin.bind(null, p.user_id, p.is_admin)}>
                          <button
                            type="submit"
                            title={p.is_admin ? 'Revoke admin' : 'Grant admin'}
                            className={`size-4 rounded border-2 transition-colors ${p.is_admin
                              ? 'bg-orange-500 border-orange-500'
                              : 'border-slate-300 hover:border-orange-300'
                            }`}
                          >
                            {p.is_admin && <span className="block w-full h-full bg-white rounded-sm scale-50" />}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
