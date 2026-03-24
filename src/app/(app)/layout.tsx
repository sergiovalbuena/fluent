import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { GemsToastProvider } from '@/components/ui/gems-toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let languageCode = 'es'

  if (user) {
    const { data: langData } = await supabase
      .from('user_languages')
      .select('language_code')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (langData?.language_code) languageCode = langData.language_code
  }

  const { data: modulesData } = await supabase
    .from('modules')
    .select('slug, title, icon')
    .eq('language_code', languageCode)
    .eq('is_published', true)
    .order('order_index')

  const modules = modulesData ?? []

  return (
    <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      <SidebarNav modules={modules} />
      {/* Offset for sidebar on md+, bottom padding on mobile */}
      <div className="md:ml-[60px] pb-24 md:pb-0 min-h-screen">
        {children}
      </div>
      <BottomNav />
      <GemsToastProvider />
    </div>
  )
}
