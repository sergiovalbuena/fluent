import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Volume2, BookOpen, MessageSquare, HelpCircle, BookMarked } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'

interface PageProps {
  params: Promise<{ slug: string }>
}

type VocabItem = { word: string; translation: string; icon?: string; example?: string }
type PhraseItem = { phrase: string; translation: string }
type QAItem = { question: string; options: string[]; correct: string | number }
type StoryContent = { text?: string; highlighted_words?: string[] }

const EXERCISE_META: Record<string, {
  label: string
  Icon: React.ElementType
  color: string
  bg: string
  border: string
  description: string
}> = {
  vocabulary: {
    label: 'Vocabulary',
    Icon: BookOpen,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    description: 'Flashcards with spaced repetition',
  },
  phrases: {
    label: 'Phrases',
    Icon: MessageSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'Real everyday expressions',
  },
  qa: {
    label: 'Q&A Quiz',
    Icon: HelpCircle,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    description: 'Multiple-choice dialogue',
  },
  story: {
    label: 'Story',
    Icon: BookMarked,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'Read & write in context',
  },
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

  const vocabEx = exerciseList.find(e => e.type === 'vocabulary')
  const phrasesEx = exerciseList.find(e => e.type === 'phrases')
  const qaEx = exerciseList.find(e => e.type === 'qa')
  const storyEx = exerciseList.find(e => e.type === 'story')

  const vocabItems: VocabItem[] = (vocabEx?.content as { items?: VocabItem[] })?.items ?? []
  const phraseItems: PhraseItem[] = (phrasesEx?.content as { items?: PhraseItem[] })?.items ?? []
  const qaItems: QAItem[] = (qaEx?.content as { questions?: QAItem[] })?.questions ?? []
  const storyContent: StoryContent = (storyEx?.content as StoryContent) ?? {}

  // Exercise cards (no IIFEs — extracted as variables)
  const vocabMeta = EXERCISE_META.vocabulary
  const vocabPreview = vocabItems.slice(0, 5)
  const vocabCard = vocabEx ? (
    <Link href={`/learn/${slug}/vocabulary`}>
      <div className={`group bg-white dark:bg-slate-800/60 rounded-2xl border ${vocabMeta.border} hover:shadow-md transition-all p-5 h-full flex flex-col gap-4 cursor-pointer`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl ${vocabMeta.bg} flex items-center justify-center`}>
              <vocabMeta.Icon size={18} className={vocabMeta.color} />
            </div>
            <div>
              <p className="font-bold text-sm">{vocabMeta.label}</p>
              <p className="text-[11px] text-muted-foreground">{vocabItems.length} words · {vocabMeta.description}</p>
            </div>
          </div>
          <div className={`size-7 rounded-full ${vocabMeta.bg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}>
            <ArrowRight size={13} className={vocabMeta.color} />
          </div>
        </div>
        {vocabPreview.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vocabPreview.map((w) => (
              <span key={w.word} className={`text-[11px] font-semibold ${vocabMeta.bg} ${vocabMeta.color} px-2 py-0.5 rounded-full`}>
                {w.word}
              </span>
            ))}
            {vocabItems.length > 5 && (
              <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                +{vocabItems.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  ) : null

  const phrasesMeta = EXERCISE_META.phrases
  const phrasesFirst = phraseItems[0]
  const phrasesCard = phrasesEx ? (
    <Link href={`/learn/${slug}/phrases`}>
      <div className={`group bg-white dark:bg-slate-800/60 rounded-2xl border ${phrasesMeta.border} hover:shadow-md transition-all p-5 h-full flex flex-col gap-4 cursor-pointer`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl ${phrasesMeta.bg} flex items-center justify-center`}>
              <phrasesMeta.Icon size={18} className={phrasesMeta.color} />
            </div>
            <div>
              <p className="font-bold text-sm">{phrasesMeta.label}</p>
              <p className="text-[11px] text-muted-foreground">{phraseItems.length} phrases · {phrasesMeta.description}</p>
            </div>
          </div>
          <div className={`size-7 rounded-full ${phrasesMeta.bg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}>
            <ArrowRight size={13} className={phrasesMeta.color} />
          </div>
        </div>
        {phrasesFirst ? (
          <div className={`${phrasesMeta.bg} rounded-xl p-3`}>
            <p className={`text-sm font-semibold ${phrasesMeta.color} leading-snug`}>&ldquo;{phrasesFirst.phrase}&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-1">{phrasesFirst.translation}</p>
          </div>
        ) : null}
      </div>
    </Link>
  ) : null

  const qaMeta = EXERCISE_META.qa
  const qaFirst = qaItems[0]
  const qaCard = qaEx ? (
    <Link href={`/learn/${slug}/qa`}>
      <div className={`group bg-white dark:bg-slate-800/60 rounded-2xl border ${qaMeta.border} hover:shadow-md transition-all p-5 h-full flex flex-col gap-4 cursor-pointer`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl ${qaMeta.bg} flex items-center justify-center`}>
              <qaMeta.Icon size={18} className={qaMeta.color} />
            </div>
            <div>
              <p className="font-bold text-sm">{qaMeta.label}</p>
              <p className="text-[11px] text-muted-foreground">{qaItems.length} questions · {qaMeta.description}</p>
            </div>
          </div>
          <div className={`size-7 rounded-full ${qaMeta.bg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}>
            <ArrowRight size={13} className={qaMeta.color} />
          </div>
        </div>
        {qaFirst ? (
          <div className={`${qaMeta.bg} rounded-xl p-3`}>
            <p className={`text-sm font-semibold ${qaMeta.color} leading-snug line-clamp-2`}>{qaFirst.question}</p>
            {qaFirst.options && (
              <div className="flex flex-wrap gap-1 mt-2">
                {qaFirst.options.slice(0, 2).map((opt, i) => (
                  <span key={i} className="text-[10px] bg-white/60 dark:bg-slate-700 px-2 py-0.5 rounded-full text-muted-foreground">
                    {opt}
                  </span>
                ))}
                {qaFirst.options.length > 2 && (
                  <span className="text-[10px] text-muted-foreground px-1">…</span>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  ) : null

  const storyMeta = EXERCISE_META.story
  const storyPreview = storyContent.text?.slice(0, 120)
  const storyCard = storyEx ? (
    <Link href={`/learn/${slug}/story`}>
      <div className={`group bg-white dark:bg-slate-800/60 rounded-2xl border ${storyMeta.border} hover:shadow-md transition-all p-5 h-full flex flex-col gap-4 cursor-pointer`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl ${storyMeta.bg} flex items-center justify-center`}>
              <storyMeta.Icon size={18} className={storyMeta.color} />
            </div>
            <div>
              <p className="font-bold text-sm">{storyMeta.label}</p>
              <p className="text-[11px] text-muted-foreground">{storyMeta.description}</p>
            </div>
          </div>
          <div className={`size-7 rounded-full ${storyMeta.bg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}>
            <ArrowRight size={13} className={storyMeta.color} />
          </div>
        </div>
        {storyPreview ? (
          <div className={`${storyMeta.bg} rounded-xl p-3`}>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 italic">
              &ldquo;{storyPreview}{storyContent.text && storyContent.text.length > 120 ? '…' : ''}&rdquo;
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  ) : null

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">

      <AppTopbar back={{ href: '/learn', label: 'All Lessons' }} />

      <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* ── Hero ── */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-amber-400 text-white shadow-xl shadow-primary/20">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[8rem] leading-none opacity-20 pointer-events-none select-none">
              {lesson.icon}
            </div>
            <div className="relative p-7 md:p-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">
                {lesson.language_code?.toUpperCase()} · {exerciseList.length} exercises
              </p>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-1">{lesson.title}</h1>
              {lesson.description ? (
                <p className="text-white/70 text-sm mb-6 max-w-md">{lesson.description}</p>
              ) : null}
              <div className="mb-6 max-w-sm">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-white/70">Your progress</span>
                  <span>0%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full">
                  <div className="h-full bg-white rounded-full w-0" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {exerciseList[0] ? (
                  <Link href={`/learn/${slug}/${exerciseList[0].type}`}>
                    <button className="flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all active:scale-95 text-sm shadow-lg">
                      Start Lesson <ArrowRight size={16} />
                    </button>
                  </Link>
                ) : null}
                <Link href={`/learn/${slug}/flashcards`}>
                  <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95 text-sm border border-white/20">
                    🃏 Flashcards
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Exercise Cards ── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-1">Lesson Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vocabCard}
              {phrasesCard}
              {qaCard}
              {storyCard}
            </div>
          </div>

          {/* ── Vocabulary word list ── */}
          {vocabItems.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Vocabulary · {vocabItems.length} words
                </h2>
                {vocabEx ? (
                  <Link href={`/learn/${slug}/vocabulary`} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    Study all <ArrowRight size={12} />
                  </Link>
                ) : null}
              </div>
              <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
                {vocabItems.map((word) => (
                  <div key={word.word} className="flex items-center gap-4 px-4 py-3 hover:bg-primary/5 transition-colors group">
                    {word.icon ? <span className="text-xl shrink-0 w-7 text-center">{word.icon}</span> : null}
                    <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                      <p className="font-semibold text-sm">{word.word}</p>
                      <p className="text-sm text-muted-foreground text-right shrink-0">{word.translation}</p>
                    </div>
                    <button className="text-primary/30 hover:text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                      <Volume2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      </main>
    </div>
  )
}
