import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { AppTopbar } from '@/components/layout/app-topbar'

export default async function LearnPage() {
  const supabase = await createClient()

  const { data: lessons } = await supabase
    .from('modules')
    .select('*, lessons(id)')
    .eq('language_code', 'es')
    .eq('is_published', true)
    .order('order_index')

  const lessonsWithProgress = (lessons ?? []).map((m: {
    id: string
    slug: string
    title: string
    description: string | null
    icon: string
    icon_color: string
    lessons: Array<{ id: string }>
  }) => ({
    ...m,
    totalExercises: m.lessons?.length ?? 0,
    completedExercises: 0,
    progress: 0,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar title="All Lessons" subtitle={`Spanish · ${lessonsWithProgress.length} lessons`} />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {lessonsWithProgress.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="text-5xl">📚</span>
              <h2 className="text-xl font-bold">No lessons yet</h2>
              <p className="text-muted-foreground text-sm">Check back soon for new content.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {lessonsWithProgress.map((lesson: {
              id: string; slug: string; icon: string; title: string; description: string | null
              completedExercises: number; totalExercises: number; progress: number
            }) => (
              <Link key={lesson.id} href={`/learn/${lesson.slug}`}>
                <div className="flex flex-col bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden group">
                  <div className="w-full bg-primary/5 aspect-video flex items-center justify-center text-5xl group-hover:bg-primary/10 transition-colors">
                    {lesson.icon}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="font-bold text-base">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{lesson.description}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{lesson.completedExercises}/{lesson.totalExercises} exercises</span>
                        <span className="text-primary font-bold">{lesson.progress}%</span>
                      </div>
                      <Progress value={lesson.progress} className="h-1.5 bg-primary/10 [&>div]:bg-primary" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
