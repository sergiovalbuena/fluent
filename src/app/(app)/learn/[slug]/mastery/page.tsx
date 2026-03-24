import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AppTopbar } from '@/components/layout/app-topbar'
import { MasteryContent } from '@/components/learn/mastery-content'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function MasteryPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: module } = await supabase
    .from('modules')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (!module) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, type, title, content')
    .eq('module_id', module.id)
    .eq('is_published', true)
    .order('order_index')

  const lessonList = lessons ?? []
  const lessonIds = lessonList.map(l => l.id)

  let allThreeStars = false
  let hasCrown = false

  if (user && lessonIds.length > 0) {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('lesson_id, stars, has_crown')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    if (progress && progress.length === lessonIds.length) {
      allThreeStars = progress.every(p => (p.stars ?? 0) >= 3)
      hasCrown = progress.some(p => p.has_crown)
    }
  }

  // Build quiz from vocab/phrases/qa lessons
  type QuizItem = {
    question: string
    options: string[]
    answer: string
  }

  const quizItems: QuizItem[] = []

  for (const lesson of lessonList) {
    if (lesson.type === 'vocabulary') {
      const items = (lesson.content as { items?: { word: string; translation: string }[] })?.items ?? []
      items.slice(0, 3).forEach(item => {
        quizItems.push({
          question: `What is "${item.word}"?`,
          options: [item.translation],
          answer: item.translation,
        })
      })
    } else if (lesson.type === 'phrases') {
      const items = (lesson.content as { items?: { phrase: string; translation: string }[] })?.items ?? []
      items.slice(0, 2).forEach(item => {
        quizItems.push({
          question: `Translate: "${item.phrase}"`,
          options: [item.translation],
          answer: item.translation,
        })
      })
    } else if (lesson.type === 'qa') {
      const questions = (lesson.content as { questions?: { question: string; answer: string; options?: string[] }[] })?.questions ?? []
      questions.slice(0, 2).forEach(q => {
        quizItems.push({
          question: q.question,
          options: q.options ?? [q.answer],
          answer: q.answer,
        })
      })
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar back={{ href: `/learn/${slug}`, label: module.title }} />
      <main className="flex-1 px-3 md:px-6 py-4 md:py-6">
        <div className="max-w-2xl mx-auto">
          <MasteryContent
            slug={slug}
            moduleTitle={module.title}
            moduleIcon={module.icon ?? '🏆'}
            quizItems={quizItems}
            allThreeStars={allThreeStars}
            hasCrown={hasCrown}
            userId={user?.id ?? null}
            lessonIds={lessonIds}
          />
        </div>
      </main>
    </div>
  )
}
