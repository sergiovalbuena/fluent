'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Volume2, ArrowRight, Check, X, RotateCcw,
  BookOpen, MessageSquare, HelpCircle, BookMarked, Shuffle, PenLine,
} from 'lucide-react'
import Link from 'next/link'
import { AppTopbar } from '@/components/layout/app-topbar'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ResultScreen } from '@/components/lesson/result-screen'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabWord {
  word: string
  translation: string
  emoji: string
  example?: string
}

interface Phrase {
  phrase: string
  translation: string
}

interface QAQuestion {
  question: string
  options: string[]
  correct: number
  explanation?: string
}

interface ArrangeSentence {
  words: string[]
  translation: string
}

interface TranslateItem {
  prompt: string
  answer: string
  hint?: string
}

interface LessonContent {
  words?: VocabWord[]
  phrases?: Phrase[]
  questions?: QAQuestion[]
  story?: string
  highlightedWords?: string[]
  arrangeSentences?: ArrangeSentence[]
  translateItems?: TranslateItem[]
}

interface RawContent {
  items?: Array<{
    word?: string; translation?: string; icon?: string; example?: string
    phrase?: string; prompt?: string; answer?: string; hint?: string
  }>
  questions?: Array<{ question: string; options: string[]; correct: string | number; explanation?: string }>
  sentences?: Array<{ words: string[]; translation: string }>
  text?: string
  highlighted_words?: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeContent(raw: RawContent, lessonType: string): LessonContent {
  if (lessonType === 'vocabulary') {
    return {
      words: (raw.items ?? []).map(i => ({
        word: i.word ?? '',
        translation: i.translation ?? '',
        emoji: i.icon ?? '📝',
        example: i.example,
      })),
    }
  }
  if (lessonType === 'phrases') {
    return {
      phrases: (raw.items ?? []).map(i => ({
        phrase: i.phrase ?? '',
        translation: i.translation ?? '',
      })),
    }
  }
  if (lessonType === 'qa') {
    return {
      questions: (raw.questions ?? []).map(q => ({
        question: q.question,
        options: q.options,
        correct: typeof q.correct === 'number' ? q.correct : q.options.indexOf(q.correct as string),
        explanation: q.explanation,
      })),
    }
  }
  if (lessonType === 'story') {
    return { story: raw.text, highlightedWords: raw.highlighted_words }
  }
  if (lessonType === 'arrange') {
    return {
      arrangeSentences: (raw.sentences ?? []).map(s => ({
        words: s.words,
        translation: s.translation,
      })),
    }
  }
  if (lessonType === 'translate') {
    return {
      translateItems: (raw.items ?? []).map(i => ({
        prompt: i.prompt ?? '',
        answer: i.answer ?? '',
        hint: i.hint,
      })),
    }
  }
  return {}
}

function fuzzyMatch(input: string, answer: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[¿¡.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  return normalize(input) === normalize(answer)
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ACTIVITIES = [
  { key: 'vocabulary', label: 'Vocab',    Icon: BookOpen,      accent: '#ff8052', light: '#fff4f0' },
  { key: 'phrases',    label: 'Phrases',  Icon: MessageSquare, accent: '#3b82f6', light: '#eff6ff' },
  { key: 'qa',         label: 'Quiz',     Icon: HelpCircle,    accent: '#8b5cf6', light: '#f5f3ff' },
  { key: 'story',      label: 'Story',    Icon: BookMarked,    accent: '#10b981', light: '#ecfdf5' },
  { key: 'arrange',    label: 'Arrange',  Icon: Shuffle,       accent: '#f59e0b', light: '#fffbeb' },
  { key: 'translate',  label: 'Write',    Icon: PenLine,       accent: '#ec4899', light: '#fdf2f8' },
]

// Hoisted constants
const COLOR_CORRECT            = '#22c55e'
const COLOR_INCORRECT          = '#ef4444'
const COLOR_CONNECTOR_PAST     = '#86efac'
const COLOR_CONNECTOR_INACTIVE = '#e2e8f0'

// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <p className="text-muted-foreground text-center text-sm">{message}</p>
    </div>
  )
}

function CompletionCard({
  icon, title, subtitle, nextLabel, onNext, onRestart,
}: {
  icon: string; title: string; subtitle: string
  nextLabel: string; onNext: () => void; onRestart: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 w-full text-center py-10 px-6">
      <div className="text-7xl">{icon}</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onNext}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25"
        >
          {nextLabel} <ArrowRight size={16} />
        </button>
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold active:scale-95 transition-transform"
        >
          <RotateCcw size={13} /> Practice again
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const params  = useParams()
  const router  = useRouter()
  const slug     = params.slug     as string
  const activity = params.activity as string

  const [lesson,   setLesson]   = useState<{ title: string; content: LessonContent } | null>(null)
  const [lessonId, setLessonId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // Result screen
  const [resultData, setResultData] = useState<{ score: number; xpEarned: number } | null>(null)

  // Vocabulary
  const [vocabIndex,   setVocabIndex]   = useState(0)
  const [vocabFlipped, setVocabFlipped] = useState(false)

  // Phrases
  const [phraseIndex,    setPhraseIndex]    = useState(0)
  const [phraseRevealed, setPhraseRevealed] = useState(false)
  const [phraseDone,     setPhraseDone]     = useState(false)

  // Q&A
  const [qIndex,       setQIndex]       = useState(0)
  const [selected,     setSelected]     = useState<number | null>(null)
  const [checked,      setChecked]      = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [qaDone,       setQaDone]       = useState(false)

  // Story
  const [storyInput, setStoryInput] = useState('')

  // Arrange
  const [arrangeIndex,      setArrangeIndex]      = useState(0)
  const [pickedIndices,     setPickedIndices]      = useState<number[]>([])
  const [arrangeChecked,    setArrangeChecked]    = useState(false)
  const [arrangeIsCorrect,  setArrangeIsCorrect]  = useState(false)
  const [arrangeCorrectCount, setArrangeCorrectCount] = useState(0)
  const [arrangeDone,       setArrangeDone]       = useState(false)

  // Translate
  const [translateIndex,        setTranslateIndex]        = useState(0)
  const [translateInput,        setTranslateInput]        = useState('')
  const [translateChecked,      setTranslateChecked]      = useState(false)
  const [translateIsCorrect,    setTranslateIsCorrect]    = useState(false)
  const [translateCorrectCount, setTranslateCorrectCount] = useState(0)
  const [translateDone,         setTranslateDone]         = useState(false)

  // Reset per-activity state on route change
  useEffect(() => {
    setVocabIndex(0); setVocabFlipped(false)
    setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false)
    setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false)
    setStoryInput('')
    setArrangeIndex(0); setPickedIndices([]); setArrangeChecked(false); setArrangeIsCorrect(false); setArrangeCorrectCount(0); setArrangeDone(false)
    setTranslateIndex(0); setTranslateInput(''); setTranslateChecked(false); setTranslateIsCorrect(false); setTranslateCorrectCount(0); setTranslateDone(false)
    setResultData(null)
  }, [activity])

  // Reset arrange word selection when sentence changes
  useEffect(() => {
    setPickedIndices([])
    setArrangeChecked(false)
    setArrangeIsCorrect(false)
  }, [arrangeIndex])

  // Reset translate input when item changes
  useEffect(() => {
    setTranslateInput('')
    setTranslateChecked(false)
    setTranslateIsCorrect(false)
  }, [translateIndex])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const { data: mod } = await supabase
        .from('modules')
        .select('id')
        .eq('slug', slug)
        .limit(1)
        .maybeSingle()

      if (!mod) { setLoading(false); return }

      const { data } = await supabase
        .from('lessons')
        .select('id, title, type, content, module_id')
        .eq('module_id', mod.id)
        .eq('type', activity)
        .maybeSingle()

      if (data) {
        setLesson({ title: data.title, content: normalizeContent(data.content as RawContent, data.type) })
        setLessonId(data.id)
        setModuleId(data.module_id)
      }
      setLoading(false)
    }
    load()
  }, [slug, activity])

  // ── DB helpers ────────────────────────────────────────────────────────────

  async function saveProgress(score: number) {
    if (!lessonId || !moduleId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      module_id: moduleId,
      completed_at: new Date().toISOString(),
      score,
      attempts: 1,
    }, { onConflict: 'user_id,lesson_id' })
  }

  async function updateXpAndStreak(score: number): Promise<number> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 10

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_xp, streak_count, longest_streak, last_activity_date')
      .eq('user_id', user.id)
      .maybeSingle()

    const today = new Date().toISOString().split('T')[0]
    const isNewDay = profile?.last_activity_date !== today
    const newStreak = isNewDay ? (profile?.streak_count ?? 0) + 1 : (profile?.streak_count ?? 0)
    const xpEarned = score >= 80 ? 20 : score >= 60 ? 15 : 10

    await supabase.from('user_profiles').update({
      total_xp: (profile?.total_xp ?? 0) + xpEarned,
      streak_count: newStreak,
      longest_streak: Math.max(newStreak, profile?.longest_streak ?? 0),
      last_activity_date: today,
    }).eq('user_id', user.id)

    return xpEarned
  }

  async function handleFinishLesson(score = 100) {
    setSaving(true)
    await saveProgress(score)
    const xpEarned = await updateXpAndStreak(score)
    setResultData({ score, xpEarned })
    setSaving(false)
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const activityIdx  = ACTIVITIES.findIndex(a => a.key === activity)
  const currentMeta  = ACTIVITIES[activityIdx] ?? ACTIVITIES[0]
  const nextActivity = ACTIVITIES[activityIdx + 1] ?? null

  const nextHref  = nextActivity ? `/learn/${slug}/${nextActivity.key}` : `/learn/${slug}`
  const nextLabel = nextActivity ? nextActivity.label : 'Back to Module'

  // Saves progress and navigates to the next activity (for non-final activities)
  async function handleActivityComplete(score: number) {
    void saveProgress(score) // fire-and-forget
    router.push(nextHref)
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const content   = lesson?.content ?? {}
  const words     = content.words     ?? []
  const phrases   = content.phrases   ?? []
  const questions = content.questions ?? []
  const arrangeSentences = content.arrangeSentences ?? []
  const translateItems   = content.translateItems   ?? []

  const currentArrangeSentence = arrangeSentences[arrangeIndex]

  // Shuffled words for current arrange sentence (stable per sentence)
  const shuffledWords = useMemo<string[]>(() => {
    if (!currentArrangeSentence) return []
    return shuffleArray([...currentArrangeSentence.words])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangeIndex, arrangeSentences.length])

  const availableWords = shuffledWords.filter((_, i) => !pickedIndices.includes(i))
  const answerWords    = pickedIndices.map(i => shuffledWords[i])

  function checkArrangeAnswer() {
    const isCorrect = answerWords.join(' ') === currentArrangeSentence?.words.join(' ')
    setArrangeIsCorrect(isCorrect)
    setArrangeChecked(true)
    if (isCorrect) setArrangeCorrectCount(c => c + 1)
  }

  function advanceArrange() {
    if (arrangeIndex + 1 >= arrangeSentences.length) {
      setArrangeDone(true)
    } else {
      setArrangeIndex(i => i + 1)
    }
  }

  function checkTranslateAnswer() {
    const item = translateItems[translateIndex]
    if (!item) return
    const isCorrect = fuzzyMatch(translateInput, item.answer)
    setTranslateIsCorrect(isCorrect)
    setTranslateChecked(true)
    if (isCorrect) setTranslateCorrectCount(c => c + 1)
  }

  function advanceTranslate() {
    if (translateIndex + 1 >= translateItems.length) {
      setTranslateDone(true)
    } else {
      setTranslateIndex(i => i + 1)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-14 rounded-3xl bg-primary/10 flex items-center justify-center">
            <BookOpen size={26} className="text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  // ── Result screen ──────────────────────────────────────────────────────────

  if (resultData) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppTopbar back={{ href: `/learn/${slug}`, label: lesson.title }} />
        <ResultScreen
          score={resultData.score}
          xpEarned={resultData.xpEarned}
          onContinue={() => router.push('/learn')}
          onRestart={() => {
            setResultData(null)
            setStoryInput('')
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      <AppTopbar back={{ href: `/learn/${slug}`, label: lesson.title }} />

      {/* ── Activity stepper ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-black/5 dark:border-white/5 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center">
          {ACTIVITIES.slice(0, 4).map((a, i) => {
            const isCurrent = a.key === activity
            const isPast    = i < activityIdx && activityIdx < 4
            const Icon      = a.Icon
            return (
              <div key={a.key} className="flex items-center flex-1">
                <Link
                  href={`/learn/${slug}/${a.key}`}
                  className={cn('flex items-center gap-1.5 transition-opacity', !isCurrent && 'opacity-50 hover:opacity-80')}
                >
                  <div
                    className={cn(
                      'size-7 rounded-full flex items-center justify-center transition-all',
                      !isCurrent && !isPast && 'bg-slate-100 dark:bg-slate-800',
                    )}
                    style={{
                      backgroundColor: isCurrent ? a.accent : isPast ? COLOR_CORRECT : undefined,
                      color: (isCurrent || isPast) ? '#fff' : undefined,
                    }}
                  >
                    {isPast
                      ? <Check size={11} />
                      : <Icon size={11} className={!isCurrent && !isPast ? 'text-slate-400' : ''} />
                    }
                  </div>
                  <span
                    className="text-[11px] font-bold hidden sm:block"
                    style={{ color: isCurrent ? a.accent : isPast ? COLOR_CORRECT : undefined }}
                  >
                    {a.label}
                  </span>
                </Link>
                {i < 3 && (
                  <div
                    className="flex-1 h-px mx-2"
                    style={{ backgroundColor: i < activityIdx && activityIdx < 4 ? COLOR_CONNECTOR_PAST : COLOR_CONNECTOR_INACTIVE }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VOCABULARY
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'vocabulary' && (
        <div className="flex-1 flex flex-col items-center p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {words.length === 0 ? (
            <EmptyState message="No vocabulary in this lesson." />
          ) : vocabIndex >= words.length ? (
            <CompletionCard
              icon="🎯"
              title="All words reviewed!"
              subtitle={`${words.length} words covered`}
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(100)}
              onRestart={() => { setVocabIndex(0); setVocabFlipped(false) }}
            />
          ) : (
            <>
              {/* Progress bar */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Vocabulary
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {vocabIndex + 1} / {words.length}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(vocabIndex / words.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* 3D Flip Card */}
              <div
                className="w-full flex-1 max-h-80 cursor-pointer select-none"
                style={{ perspective: '1200px' }}
                onClick={() => setVocabFlipped(f => !f)}
              >
                <div
                  className="relative w-full h-full transition-transform duration-500"
                  style={{ transformStyle: 'preserve-3d', transform: vocabFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-black/5 flex flex-col items-center justify-center gap-5 p-8"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="text-8xl">{words[vocabIndex].emoji}</span>
                    <h2 className="text-4xl font-bold tracking-tight text-center">{words[vocabIndex].word}</h2>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RotateCcw size={10} />
                      <span>tap to reveal</span>
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-black/5 flex flex-col items-center justify-center gap-4 p-8"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-7xl">{words[vocabIndex].emoji}</span>
                    <div className="text-center space-y-1">
                      <p className="text-3xl font-bold" style={{ color: currentMeta.accent }}>
                        {words[vocabIndex].translation}
                      </p>
                      <p className="text-base text-muted-foreground">{words[vocabIndex].word}</p>
                    </div>
                    {words[vocabIndex].example && (
                      <div className="rounded-2xl px-4 py-2 max-w-xs text-center" style={{ backgroundColor: `${currentMeta.accent}12` }}>
                        <p className="text-xs text-muted-foreground italic">&ldquo;{words[vocabIndex].example}&rdquo;</p>
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toast.info('Audio coming soon') }}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div
                className="w-full flex flex-col gap-3 transition-all duration-300"
                style={{ opacity: vocabFlipped ? 1 : 0, pointerEvents: vocabFlipped ? 'auto' : 'none' }}
              >
                <button
                  onClick={() => { setVocabFlipped(false); setVocabIndex(i => i + 1) }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform shadow-lg"
                  style={{ backgroundColor: currentMeta.accent, boxShadow: `0 8px 24px ${currentMeta.accent}35` }}
                >
                  <Check size={18} /> Got it!
                </button>
                <button
                  onClick={() => { setVocabFlipped(false); setVocabIndex(i => i + 1) }}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold active:scale-95 transition-transform"
                >
                  Still learning…
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PHRASES
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'phrases' && (
        <div className="flex-1 flex flex-col items-center p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {phrases.length === 0 ? (
            <EmptyState message="No phrases in this lesson." />
          ) : phraseDone ? (
            <CompletionCard
              icon="💬"
              title="All phrases reviewed!"
              subtitle={`${phrases.length} phrases practiced`}
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(100)}
              onRestart={() => { setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false) }}
            />
          ) : (
            <>
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Phrases</span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {phraseIndex + 1} / {phrases.length}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(phraseIndex / phrases.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* Phrase card */}
              <div
                className="w-full flex-1 max-h-72 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-5 p-8 text-center select-none cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: phraseRevealed ? currentMeta.light : '#fff',
                  border: `1.5px solid ${phraseRevealed ? `${currentMeta.accent}40` : '#f1f5f9'}`,
                }}
                onClick={() => !phraseRevealed && setPhraseRevealed(true)}
              >
                <p className="text-2xl md:text-3xl font-bold leading-snug">{phrases[phraseIndex].phrase}</p>
                {!phraseRevealed ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RotateCcw size={10} />
                    <span>tap for translation</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-semibold" style={{ color: currentMeta.accent }}>
                      {phrases[phraseIndex].translation}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); toast.info('Audio coming soon') }}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div
                className="w-full transition-all duration-300"
                style={{ opacity: phraseRevealed ? 1 : 0, pointerEvents: phraseRevealed ? 'auto' : 'none' }}
              >
                <button
                  onClick={() => {
                    if (phraseIndex + 1 >= phrases.length) setPhraseDone(true)
                    else { setPhraseIndex(i => i + 1); setPhraseRevealed(false) }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform"
                  style={{ backgroundColor: currentMeta.accent, boxShadow: `0 8px 24px ${currentMeta.accent}35` }}
                >
                  {phraseIndex + 1 >= phrases.length ? 'All done!' : 'Next phrase'} <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Q&A
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'qa' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-4 max-w-lg mx-auto w-full">
          {questions.length === 0 ? (
            <EmptyState message="No questions in this lesson." />
          ) : qaDone ? (
            <CompletionCard
              icon={correctCount === questions.length ? '🏆' : correctCount >= Math.ceil(questions.length / 2) ? '⭐' : '💪'}
              title={correctCount === questions.length ? 'Perfect score!' : `${correctCount} / ${questions.length} correct`}
              subtitle={correctCount === questions.length ? 'You nailed every question!' : 'Keep going — practice makes perfect.'}
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(Math.round((correctCount / questions.length) * 100))}
              onRestart={() => { setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false) }}
            />
          ) : (
            <>
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Question {qIndex + 1} of {questions.length}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {correctCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(qIndex / questions.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div
                className="rounded-3xl p-5 border shadow-sm"
                style={{ backgroundColor: currentMeta.light, borderColor: `${currentMeta.accent}25` }}
              >
                <p className="text-base md:text-lg font-bold leading-snug">{questions[qIndex].question}</p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2.5 flex-1">
                {questions[qIndex].options.map((option, i) => {
                  const isSelected = selected === i
                  const isCorrect  = i === questions[qIndex].correct
                  const show       = checked

                  let borderColor = '#e2e8f0'
                  let bgColor     = '#fff'
                  let textColor   = 'inherit'
                  let badgeBg     = '#f1f5f9'
                  let badgeColor  = '#94a3b8'

                  if (!show && isSelected) {
                    borderColor = currentMeta.accent
                    bgColor     = `${currentMeta.accent}12`
                    badgeBg     = currentMeta.accent
                    badgeColor  = '#fff'
                  } else if (show && isCorrect) {
                    borderColor = COLOR_CORRECT; bgColor = '#f0fdf4'; textColor = '#15803d'
                    badgeBg     = COLOR_CORRECT; badgeColor = '#fff'
                  } else if (show && isSelected && !isCorrect) {
                    borderColor = COLOR_INCORRECT; bgColor = '#fef2f2'; textColor = '#b91c1c'
                    badgeBg     = COLOR_INCORRECT; badgeColor = '#fff'
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !checked && setSelected(i)}
                      disabled={checked}
                      className="w-full text-left px-4 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all flex items-center gap-3 active:scale-[0.98]"
                      style={{
                        borderColor, backgroundColor: bgColor, color: textColor,
                        opacity: show && !isSelected && !isCorrect ? 0.45 : 1,
                      }}
                    >
                      <span
                        className="size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                      >
                        {show && isCorrect
                          ? <Check size={13} />
                          : show && isSelected && !isCorrect
                            ? <X size={13} />
                            : String.fromCharCode(65 + i)
                        }
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {checked && questions[qIndex].explanation && (
                <div
                  className="rounded-2xl p-4 border text-sm leading-relaxed"
                  style={{ backgroundColor: `${currentMeta.accent}0d`, borderColor: `${currentMeta.accent}30`, color: currentMeta.accent }}
                >
                  {questions[qIndex].explanation}
                </div>
              )}

              {/* CTA */}
              {!checked ? (
                <button
                  onClick={() => selected !== null && setChecked(true)}
                  disabled={selected === null}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  style={{ backgroundColor: currentMeta.accent, boxShadow: selected !== null ? `0 8px 24px ${currentMeta.accent}35` : 'none' }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={() => {
                    const correct = selected === questions[qIndex].correct
                    if (correct) setCorrectCount(c => c + 1)
                    if (qIndex + 1 >= questions.length) {
                      setQaDone(true)
                    } else {
                      setQIndex(i => i + 1); setSelected(null); setChecked(false)
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform"
                  style={{
                    backgroundColor: selected === questions[qIndex].correct ? COLOR_CORRECT : '#64748b',
                    boxShadow: selected === questions[qIndex].correct ? `0 8px 20px ${COLOR_CORRECT}30` : 'none',
                  }}
                >
                  {selected === questions[qIndex].correct ? '✓ Correct — ' : '✗ Incorrect — '}
                  {qIndex + 1 >= questions.length ? 'See results' : 'Next question'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STORY
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'story' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Story</span>
            {(content.highlightedWords?.length ?? 0) > 0 && (
              <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                {content.highlightedWords!.length} key words
              </span>
            )}
          </div>

          {content.story ? (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 shadow-sm p-6 md:p-8">
                <TextGenerateEffect
                  words={content.story}
                  duration={0.4}
                  filter={true}
                  highlightedWords={content.highlightedWords}
                  highlightColor={currentMeta.accent}
                />
              </div>

              {(content.highlightedWords?.length ?? 0) > 0 && (
                <div
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: `${currentMeta.accent}08`, borderColor: `${currentMeta.accent}25` }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: currentMeta.accent }}>
                    Key words
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {content.highlightedWords!.map((w, i) => (
                      <span
                        key={i}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${currentMeta.accent}18`, color: currentMeta.accent }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Write your own sentence
                </label>
                <textarea
                  value={storyInput}
                  onChange={e => setStoryInput(e.target.value)}
                  placeholder="Try using one of the key words…"
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none h-24 focus:outline-none transition-colors"
                  onFocus={e => (e.target.style.borderColor = `${currentMeta.accent}80`)}
                  onBlur={e => (e.target.style.borderColor = '')}
                />
              </div>
            </>
          ) : (
            <EmptyState message="No story in this lesson." />
          )}

          <button
            onClick={() => handleFinishLesson(100)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25 mt-auto disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Finish Lesson 🎉'}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ARRANGE — Build the sentence
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'arrange' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {arrangeSentences.length === 0 ? (
            <EmptyState message="No sentences in this lesson." />
          ) : arrangeDone ? (
            <CompletionCard
              icon={arrangeCorrectCount === arrangeSentences.length ? '🏆' : '⭐'}
              title={arrangeCorrectCount === arrangeSentences.length ? 'Perfect!' : `${arrangeCorrectCount} / ${arrangeSentences.length} correct`}
              subtitle="Sentence builder complete"
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(Math.round((arrangeCorrectCount / arrangeSentences.length) * 100))}
              onRestart={() => { setArrangeIndex(0); setPickedIndices([]); setArrangeChecked(false); setArrangeIsCorrect(false); setArrangeCorrectCount(0); setArrangeDone(false) }}
            />
          ) : (
            <>
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Sentence {arrangeIndex + 1} of {arrangeSentences.length}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {arrangeCorrectCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(arrangeIndex / arrangeSentences.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* Translation prompt */}
              <div
                className="rounded-2xl p-4 border text-center"
                style={{ backgroundColor: `${currentMeta.accent}0d`, borderColor: `${currentMeta.accent}30` }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: currentMeta.accent }}>
                  Translate
                </p>
                <p className="text-base font-semibold">{currentArrangeSentence?.translation}</p>
              </div>

              {/* Answer slots */}
              <div className="min-h-[52px] flex flex-wrap gap-2 p-3 rounded-2xl border-2 border-dashed transition-colors"
                style={{ borderColor: arrangeChecked ? (arrangeIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT) : `${currentMeta.accent}40` }}
              >
                {answerWords.length === 0 ? (
                  <p className="text-sm text-muted-foreground/50 self-center">Tap words below to build the sentence…</p>
                ) : (
                  answerWords.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => !arrangeChecked && setPickedIndices(p => p.filter((_, idx) => idx !== i))}
                      disabled={arrangeChecked}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                      style={{ backgroundColor: currentMeta.accent }}
                    >
                      {w}
                    </button>
                  ))
                )}
              </div>

              {/* Feedback */}
              {arrangeChecked && (
                <div
                  className="rounded-2xl p-3 border text-sm font-semibold text-center"
                  style={{
                    backgroundColor: arrangeIsCorrect ? '#f0fdf4' : '#fef2f2',
                    borderColor: arrangeIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT,
                    color: arrangeIsCorrect ? '#15803d' : '#b91c1c',
                  }}
                >
                  {arrangeIsCorrect
                    ? '✓ Correct!'
                    : `✗ The answer was: "${currentArrangeSentence?.words.join(' ')}"`
                  }
                </div>
              )}

              {/* Available word chips */}
              <div className="flex flex-wrap gap-2">
                {shuffledWords.map((w, i) => {
                  const isPicked = pickedIndices.includes(i)
                  return (
                    <button
                      key={i}
                      onClick={() => !arrangeChecked && !isPicked && setPickedIndices(p => [...p, i])}
                      disabled={arrangeChecked || isPicked}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95"
                      style={{
                        borderColor: isPicked ? '#e2e8f0' : `${currentMeta.accent}60`,
                        backgroundColor: isPicked ? '#f8fafc' : 'white',
                        color: isPicked ? '#cbd5e1' : 'inherit',
                        opacity: isPicked ? 0.4 : 1,
                      }}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>

              {/* CTA */}
              {!arrangeChecked ? (
                <button
                  onClick={checkArrangeAnswer}
                  disabled={answerWords.length === 0}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 mt-auto"
                  style={{ backgroundColor: currentMeta.accent }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={advanceArrange}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform mt-auto"
                  style={{
                    backgroundColor: arrangeIsCorrect ? COLOR_CORRECT : '#64748b',
                  }}
                >
                  {arrangeIndex + 1 >= arrangeSentences.length ? 'See results' : 'Next sentence'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TRANSLATE — Free text input
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'translate' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {translateItems.length === 0 ? (
            <EmptyState message="No translation exercises in this lesson." />
          ) : translateDone ? (
            <CompletionCard
              icon={translateCorrectCount === translateItems.length ? '🏆' : '⭐'}
              title={translateCorrectCount === translateItems.length ? 'Perfect!' : `${translateCorrectCount} / ${translateItems.length} correct`}
              subtitle="Translation practice complete"
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(Math.round((translateCorrectCount / translateItems.length) * 100))}
              onRestart={() => { setTranslateIndex(0); setTranslateInput(''); setTranslateChecked(false); setTranslateIsCorrect(false); setTranslateCorrectCount(0); setTranslateDone(false) }}
            />
          ) : (
            <>
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {translateIndex + 1} / {translateItems.length}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {translateCorrectCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(translateIndex / translateItems.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* Prompt card */}
              <div
                className="rounded-3xl p-6 border shadow-sm text-center"
                style={{ backgroundColor: currentMeta.light, borderColor: `${currentMeta.accent}25` }}
              >
                <p className="text-xl md:text-2xl font-bold leading-snug">{translateItems[translateIndex].prompt}</p>
                {translateItems[translateIndex].hint && (
                  <p className="text-xs text-muted-foreground mt-2">{translateItems[translateIndex].hint}</p>
                )}
              </div>

              {/* Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Your translation
                </label>
                <input
                  type="text"
                  value={translateInput}
                  onChange={e => setTranslateInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !translateChecked && translateInput.trim() && checkTranslateAnswer()}
                  disabled={translateChecked}
                  placeholder="Type your answer…"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base focus:outline-none transition-colors disabled:opacity-70"
                  onFocus={e => (e.target.style.borderColor = `${currentMeta.accent}80`)}
                  onBlur={e => (e.target.style.borderColor = '')}
                />
              </div>

              {/* Feedback */}
              {translateChecked && (
                <div
                  className="rounded-2xl p-4 border text-sm"
                  style={{
                    backgroundColor: translateIsCorrect ? '#f0fdf4' : '#fef2f2',
                    borderColor: translateIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT,
                    color: translateIsCorrect ? '#15803d' : '#b91c1c',
                  }}
                >
                  {translateIsCorrect ? (
                    <p className="font-semibold">✓ Correct!</p>
                  ) : (
                    <div>
                      <p className="font-semibold">✗ Not quite</p>
                      <p className="mt-1 font-bold">{translateItems[translateIndex].answer}</p>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              {!translateChecked ? (
                <button
                  onClick={checkTranslateAnswer}
                  disabled={!translateInput.trim()}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 mt-auto"
                  style={{ backgroundColor: currentMeta.accent }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={advanceTranslate}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform mt-auto"
                  style={{
                    backgroundColor: translateIsCorrect ? COLOR_CORRECT : '#64748b',
                  }}
                >
                  {translateIndex + 1 >= translateItems.length ? 'See results' : 'Next'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
