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

  // Fetch user progress for star display
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const lessonIds = exerciseList.map(e => e.id)
  let progressMap: Record<string, { stars: number; best_score: number; has_crown: boolean }> = {}

  let masteredWords = 0
  let masteredPhrases = 0
  let masteredQA = 0

  if (user && lessonIds.length > 0) {
    const [progressResult, masteryResult] = await Promise.all([
      supabase
        .from('user_progress')
        .select('lesson_id, stars, best_score, has_crown')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds),
      supabase
        .from('user_vocab_mastery')
        .select('word')
        .eq('user_id', user.id)
        .eq('language_code', lesson.language_code),
    ])

    if (progressResult.data) {
      progressMap = Object.fromEntries(
        progressResult.data.map(r => [r.lesson_id, { stars: r.stars, best_score: r.best_score, has_crown: r.has_crown ?? false }])
      )
    }

    if (masteryResult.data) {
      for (const row of masteryResult.data) {
        if (row.word.startsWith('phrase:')) masteredPhrases++
        else if (row.word.startsWith('qa:')) masteredQA++
        else masteredWords++
      }
    }
  }

  const allThreeStars = lessonIds.length > 0 && lessonIds.every(id => (progressMap[id]?.stars ?? 0) >= 3)
  const hasCrown = lessonIds.some(id => progressMap[id]?.has_crown)

  // Build per-type star counts
  const starsMap: Record<string, number> = {}
  if (vocabEx)     starsMap['vocabulary'] = progressMap[vocabEx.id]?.stars     ?? 0
  if (phrasesEx)   starsMap['phrases']    = progressMap[phrasesEx.id]?.stars   ?? 0
  if (qaEx)        starsMap['qa']         = progressMap[qaEx.id]?.stars        ?? 0
  if (storyEx)     starsMap['story']      = progressMap[storyEx.id]?.stars     ?? 0
  if (arrangeEx)   starsMap['arrange']    = progressMap[arrangeEx.id]?.stars   ?? 0
  if (translateEx) starsMap['translate']  = progressMap[translateEx.id]?.stars ?? 0

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
    starsMap,
    allThreeStars,
    hasCrown,
    masteredWords,
    masteredPhrases,
    masteredQA,
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
