import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar displayName={profile.display_name ?? user.email ?? 'Admin'} />
      <main className="flex-1 ml-0 md:ml-56 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
