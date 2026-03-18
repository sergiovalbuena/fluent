import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AppTopbar } from '@/components/layout/app-topbar'
import { ModuleContentView, type ModuleContentData, type VocabItem, type PhraseItem, type QAItem } from '@/components/learn/module-content'

interface PageProps {
  params: Promise<{ slug: string }>
}

const getModuleBySlug = cache(async (slug: string) => {
  const supabase = await createClient()
  return supabase
    .from('modules')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .limit(1)
    .maybeSingle()
})

const getLessonsByModuleId = cache(async (moduleId: string) => {
  const supabase = await createClient()
  return supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .eq('is_published', true)
    .order('order_index')
})

export default async function LessonPage({ params }: PageProps) {
  const { slug } = await params

  const { data: lesson } = await getModuleBySlug(slug)
  if (!lesson) notFound()

  const { data: exercises } = await getLessonsByModuleId(lesson.id)
  const exerciseList = exercises ?? []

  const vocabEx     = exerciseList.find(e => e.type === 'vocabulary')
  const phrasesEx   = exerciseList.find(e => e.type === 'phrases')
  const qaEx        = exerciseList.find(e => e.type === 'qa')
  const storyEx     = exerciseList.find(e => e.type === 'story')
  const arrangeEx   = exerciseList.find(e => e.type === 'arrange')
  const translateEx = exerciseList.find(e => e.type === 'translate')

  const vocabItems: VocabItem[]    = (vocabEx?.content as { items?: VocabItem[] })?.items ?? []
  const phraseItems: PhraseItem[]  = (phrasesEx?.content as { items?: PhraseItem[] })?.items ?? []
  const qaItems: QAItem[]          = (qaEx?.content as { questions?: QAItem[] })?.questions ?? []
  const storyContent               = (storyEx?.content as { text?: string }) ?? {}
  const arrangeCount               = (arrangeEx?.content as { sentences?: unknown[] })?.sentences?.length ?? 0
  const translateCount             = (translateEx?.content as { items?: unknown[] })?.items?.length ?? 0

  const data: ModuleContentData = {
    slug,
    title: lesson.title,
    description: lesson.description,
    icon: lesson.icon,
    languageCode: lesson.language_code,
    exerciseCount: exerciseList.length,
    firstExType: exerciseList[0]?.type,
    vocabItems,
    phraseItems,
    qaItems,
    storyText: storyContent.text,
    arrangeCount,
    translateCount,
    hasVocab: !!vocabEx,
    hasPhrases: !!phrasesEx,
    hasQA: !!qaEx,
    hasStory: !!storyEx,
    hasArrange: !!arrangeEx,
    hasTranslate: !!translateEx,
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar back={{ href: '/learn', label: 'Modules' }} />
      <main className="flex-1 px-3 md:px-6 py-4 md:py-6">
        <div className="max-w-6xl mx-auto">
          <ModuleContentView data={data} />
        </div>
      </main>
    </div>
  )
}
