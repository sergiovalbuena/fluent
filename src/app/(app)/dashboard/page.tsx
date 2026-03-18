import { createClient } from '@/lib/supabase/server'
import { DashboardContent, type Module } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('modules')
    .select('*, lessons(id)')
    .eq('language_code', 'es')
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

  return <DashboardContent modules={modules} />
}
