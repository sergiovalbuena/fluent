'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { motion, type MotionProps, AnimatePresence, usePresence, useAnimate } from 'framer-motion'
import {
  Volume2, ArrowRight, Check, X, RotateCcw,
  BookOpen, MessageSquare, HelpCircle, BookMarked, Shuffle, PenLine,
  Layers, Headphones, Keyboard, Heart, Plus,
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

// ─── Bento Block primitive ────────────────────────────────────────────────────
type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps

const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.5, y: 50, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1 },
    }}
    transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
    whileTap={{ scale: 0.97 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#2c1a12]',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

// ─── Vocabulary Word List (VanishList-inspired) ───────────────────────────────

type VocabEntry = {
  id: string | number
  word: string
  translation: string
  learned: boolean
  favorite: boolean
}

function VocabRow({
  entry,
  onToggleLearned,
  onToggleFavorite,
}: {
  entry: VocabEntry
  onToggleLearned: (id: VocabEntry['id']) => void
  onToggleFavorite: (id: VocabEntry['id']) => void
}) {
  const [isPresent, safeToRemove] = usePresence()
  const [scope, animate] = useAnimate()

  useEffect(() => {
    if (!isPresent) {
      const exit = async () => {
        animate('span', { color: '#6ee7b7' }, { duration: 0.1 })
        await animate(scope.current, { scale: 1.02 }, { duration: 0.1 })
        await animate(scope.current, { opacity: 0, x: 20 }, { delay: 0.6, duration: 0.2 })
        safeToRemove()
      }
      exit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent])

  return (
    <motion.div
      ref={scope}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-primary/[0.03] dark:hover:bg-primary/[0.04] transition-colors group"
    >
      <input
        type="checkbox"
        checked={entry.learned}
        onChange={() => onToggleLearned(entry.id)}
        className="size-4 shrink-0 rounded accent-primary cursor-pointer"
      />
      <span className={cn(
        'flex-1 font-semibold text-sm transition-colors',
        entry.learned
          ? 'line-through text-slate-300 dark:text-slate-600'
          : 'text-slate-900 dark:text-white'
      )}>
        {entry.word}
      </span>
      <span className={cn(
        'text-sm transition-colors shrink-0',
        entry.learned
          ? 'text-slate-300 dark:text-slate-600'
          : 'text-slate-400 dark:text-slate-500'
      )}>
        {entry.translation}
      </span>
      <button
        onClick={() => onToggleFavorite(entry.id)}
        className="shrink-0 ml-1 p-0.5 rounded transition-transform active:scale-90"
      >
        <Heart
          size={14}
          className={cn(
            'transition-colors',
            entry.favorite
              ? 'fill-rose-500 text-rose-500'
              : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
          )}
        />
      </button>
    </motion.div>
  )
}

function VocabWordList({ initialWords }: { initialWords: VocabEntry[] }) {
  const [entries, setEntries] = useState<VocabEntry[]>(initialWords)
  const [showForm, setShowForm] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')

  const toggleLearned  = (id: VocabEntry['id']) =>
    setEntries(pv => pv.map(e => e.id === id ? { ...e, learned: !e.learned } : e))

  const toggleFavorite = (id: VocabEntry['id']) =>
    setEntries(pv => pv.map(e => e.id === id ? { ...e, favorite: !e.favorite } : e))

  const handleAdd = () => {
    if (!newWord.trim() || !newTranslation.trim()) return
    setEntries(pv => [
      ...pv,
      { id: Date.now(), word: newWord.trim(), translation: newTranslation.trim(), learned: false, favorite: false },
    ])
    setNewWord('')
    setNewTranslation('')
    setShowForm(false)
  }

  const learnedCount  = entries.filter(e => e.learned).length
  const favCount      = entries.filter(e => e.favorite).length

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Word List</p>
        <div className="flex items-center gap-3">
          {favCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400">
              <Heart size={9} className="fill-rose-400" /> {favCount}
            </span>
          )}
          <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
            {learnedCount} / {entries.length} learned
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence initial={false}>
          {entries.map(entry => (
            <VocabRow
              key={entry.id}
              entry={entry}
              onToggleLearned={toggleLearned}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add form + button */}
      <div className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-2">
                <input
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Word (e.g. La casa)"
                  className="w-full rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <input
                  value={newTranslation}
                  onChange={e => setNewTranslation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Translation (e.g. The house)"
                  className="w-full rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  onClick={handleAdd}
                  className="w-full rounded-xl bg-primary text-white text-sm font-bold py-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  Add Word
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowForm(f => !f)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-400 hover:text-primary transition-colors"
        >
          <Plus size={13} className={cn('transition-transform duration-200', showForm ? 'rotate-45' : 'rotate-0')} />
          {showForm ? 'Cancel' : 'Add word'}
        </button>
      </div>
    </div>
  )
}

// ─── Q&A Question List ────────────────────────────────────────────────────────

function QAQuestionList({ questions, onStartQuiz }: { questions: QAQuestion[]; onStartQuiz: () => void }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Questions</p>
        <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
          {questions.length} questions
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {questions.map((q, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3.5 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-purple-500/[0.03] dark:hover:bg-purple-500/[0.04] transition-colors"
          >
            <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 w-5 shrink-0 tabular-nums pt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{q.question}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{q.options.length} options</p>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button
          onClick={onStartQuiz}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-purple-500 hover:text-purple-600 transition-colors"
        >
          <ArrowRight size={13} />
          Start quiz
        </button>
      </div>
    </div>
  )
}

// ─── Phrase List ──────────────────────────────────────────────────────────────

function PhraseList({ phrases, onPractice }: { phrases: Phrase[]; onPractice: () => void }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phrase List</p>
        <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
          {phrases.length} phrases
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {phrases.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3.5 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-blue-500/[0.03] dark:hover:bg-blue-500/[0.04] transition-colors group"
          >
            <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 w-5 shrink-0 tabular-nums pt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{p.phrase}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.translation}</p>
            </div>
            <button
              onClick={() => toast.info('Audio coming soon')}
              className="shrink-0 mt-0.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors"
            >
              <Volume2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Practice CTA */}
      <div className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button
          onClick={onPractice}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          <ArrowRight size={13} />
          Start practice
        </button>
      </div>
    </div>
  )
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

// ─── Points & Progression v1 ──────────────────────────────────────────────────

// Skills awarded per lesson activity type
const SKILL_MAP: Record<string, Partial<Record<'speaking' | 'vocabulary' | 'listening' | 'grammar', number>>> = {
  vocabulary: { vocabulary: 3 },
  phrases:    { vocabulary: 2, speaking: 1 },
  qa:         { grammar: 2, vocabulary: 1 },
  story:      { listening: 3, vocabulary: 1 },
  arrange:    { grammar: 3 },
  translate:  { grammar: 2, speaking: 1 },
}

// Stars based on how many distinct activities completed + score threshold for 3★
function calcStars(activitiesCompleted: string[], score: number): 1 | 2 | 3 {
  if (activitiesCompleted.length >= 3 && score >= 80) return 3
  if (activitiesCompleted.length >= 2) return 2
  return 1
}

// Gems per activity: +1 for repeat, +2 for perfect score
function calcGems(score: number, isRepeat: boolean): number {
  let gems = 0
  if (isRepeat) gems += 1
  if (score === 100) gems += 2
  return gems
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
  const [resultData, setResultData] = useState<{
    score: number
    xpEarned: number
    gemsEarned: number
    stars: 1 | 2 | 3
    milestoneBonusXp: number
  } | null>(null)

  // Vocabulary
  const [vocabIndex,   setVocabIndex]   = useState(0)
  const [vocabFlipped, setVocabFlipped] = useState(false)

  // Phrases
  const [phraseMode,     setPhraseMode]     = useState<'overview' | 'practice'>('overview')
  const [phraseIndex,    setPhraseIndex]    = useState(0)
  const [phraseRevealed, setPhraseRevealed] = useState(false)
  const [phraseDone,     setPhraseDone]     = useState(false)

  // Q&A
  const [qaMode,       setQaMode]       = useState<'overview' | 'quiz'>('overview')
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

  async function saveProgress(score: number): Promise<{ stars: 1 | 2 | 3; gems: number; isFirstCompletion: boolean }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const fallbackStars = calcStars([activity], score)
    if (!user || !lessonId || !moduleId) {
      return { stars: fallbackStars, gems: calcGems(score, false), isFirstCompletion: true }
    }

    const { data: existing } = await supabase
      .from('user_progress')
      .select('attempts, stars, best_score, activities_completed, completed_at')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    const isRepeat        = (existing?.attempts ?? 0) > 0
    const isFirstCompletion = !existing?.completed_at
    const prevActivities  = existing?.activities_completed ?? []
    const updatedActivities = prevActivities.includes(activity)
      ? prevActivities
      : [...prevActivities, activity]

    const newStars  = calcStars(updatedActivities, score)
    const newGems   = calcGems(score, isRepeat)
    const finalStars = Math.max(newStars, existing?.stars ?? 0) as 1 | 2 | 3

    await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      module_id: moduleId,
      completed_at: new Date().toISOString(),
      score,
      best_score: Math.max(score, existing?.best_score ?? 0),
      stars: finalStars,
      gems_earned: newGems,
      activities_completed: updatedActivities,
      attempts: (existing?.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

    return { stars: finalStars, gems: newGems, isFirstCompletion }
  }

  async function updateXpAndStreak(
    score: number,
    gemsEarned: number,
    stars: 1 | 2 | 3,
    isFirstCompletion: boolean,
  ): Promise<{ xpEarned: number; gemsEarned: number; milestoneBonusXp: number }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { xpEarned: 10, gemsEarned, milestoneBonusXp: 0 }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_xp, total_gems, streak_count, longest_streak, last_activity_date, last_streak_milestone, skills')
      .eq('user_id', user.id)
      .maybeSingle()

    const today   = new Date().toISOString().split('T')[0]
    const isNewDay = profile?.last_activity_date !== today
    const prevStreak = profile?.streak_count ?? 0
    const newStreak  = isNewDay ? prevStreak + 1 : prevStreak

    // XP formula v1
    let xpEarned = 10                          // core activity
    if (isFirstCompletion) xpEarned += 20      // lesson completion bonus
    if (stars === 3)       xpEarned += 10      // 3-star bonus
    if (isNewDay)          xpEarned += 5       // streak day bonus

    // Streak milestone bonuses (awarded once per milestone, reset on streak break)
    const lastMilestone  = profile?.last_streak_milestone ?? 0
    let milestoneBonusXp = 0
    let newMilestone     = lastMilestone
    if      (newStreak >= 14 && lastMilestone < 14) { milestoneBonusXp = 50; newMilestone = 14 }
    else if (newStreak >= 7  && lastMilestone < 7)  { milestoneBonusXp = 20; newMilestone = 7  }
    else if (newStreak >= 3  && lastMilestone < 3)  { milestoneBonusXp = 10; newMilestone = 3  }
    xpEarned += milestoneBonusXp

    // Skill gains
    const skillGains     = SKILL_MAP[activity] ?? {}
    const currentSkills  = (profile?.skills ?? { speaking: 0, vocabulary: 0, listening: 0, grammar: 0 }) as Record<string, number>
    const updatedSkills  = {
      speaking:   (currentSkills.speaking   ?? 0) + (skillGains.speaking   ?? 0),
      vocabulary: (currentSkills.vocabulary ?? 0) + (skillGains.vocabulary ?? 0),
      listening:  (currentSkills.listening  ?? 0) + (skillGains.listening  ?? 0),
      grammar:    (currentSkills.grammar    ?? 0) + (skillGains.grammar    ?? 0),
    }

    await supabase.from('user_profiles').update({
      total_xp:             (profile?.total_xp  ?? 0) + xpEarned,
      total_gems:           (profile?.total_gems ?? 0) + gemsEarned,
      streak_count:          newStreak,
      longest_streak:        Math.max(newStreak, profile?.longest_streak ?? 0),
      last_activity_date:    today,
      last_streak_milestone: newMilestone,
      skills:                updatedSkills,
    }).eq('user_id', user.id)

    // Daily activity record for charts
    const { data: todayActivity } = await supabase
      .from('user_activity')
      .select('xp_earned, lessons_completed')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .maybeSingle()

    await supabase.from('user_activity').upsert({
      user_id:           user.id,
      activity_date:     today,
      xp_earned:         (todayActivity?.xp_earned        ?? 0) + xpEarned,
      lessons_completed: (todayActivity?.lessons_completed ?? 0) + 1,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'user_id,activity_date' })

    return { xpEarned, gemsEarned, milestoneBonusXp }
  }

  async function handleFinishLesson(score = 100) {
    setSaving(true)
    const { stars, gems, isFirstCompletion } = await saveProgress(score)
    const { xpEarned, gemsEarned, milestoneBonusXp } = await updateXpAndStreak(score, gems, stars, isFirstCompletion)
    setResultData({ score, xpEarned, gemsEarned, stars, milestoneBonusXp })
    setSaving(false)
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dark-mode aware surface colors
  const surfaceBg      = isDark ? '#1e1a18' : '#ffffff'
  const borderDefault  = isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'
  const correctBg      = isDark ? 'rgba(34,197,94,0.14)'   : '#f0fdf4'
  const correctText    = isDark ? '#4ade80'                 : '#15803d'
  const incorrectBg    = isDark ? 'rgba(239,68,68,0.14)'   : '#fef2f2'
  const incorrectText  = isDark ? '#f87171'                 : '#b91c1c'

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
          gemsEarned={resultData.gemsEarned}
          stars={resultData.stars}
          milestoneBonusXp={resultData.milestoneBonusXp}
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


      {/* ══════════════════════════════════════════════════════════════════════
          VOCABULARY
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'vocabulary' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          <motion.div
            initial="initial"
            animate="animate"
            transition={{ staggerChildren: 0.05 }}
            className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
          >

            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <Block className="col-span-12 md:col-span-6 px-6 py-5 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Vocabulary
                </span>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                  {lesson.title}
                </h1>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{words.length}</p>
                <p className="text-[11px] font-semibold text-slate-400">words</p>
              </div>
            </Block>

            {/* ── NAV: other activities ────────────────────────────────────── */}
            <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-blue-500/40 p-0 min-h-[96px]">
              <Link href={`/learn/${slug}/phrases`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                <MessageSquare size={22} className="text-blue-500 mx-auto" />
                <p className="font-bold text-xs text-blue-500 text-center">Phrases</p>
              </Link>
            </Block>
            <Block whileHover={{ scale: 1.07, rotate: '-2.5deg' }} className="col-span-4 md:col-span-2 border-purple-500/40 p-0 min-h-[96px]">
              <Link href={`/learn/${slug}/qa`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                <HelpCircle size={22} className="text-purple-500 mx-auto" />
                <p className="font-bold text-xs text-purple-500 text-center">Q&amp;A</p>
              </Link>
            </Block>
            <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-emerald-500/40 p-0 min-h-[96px]">
              <Link href={`/learn/${slug}/story`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                <BookMarked size={22} className="text-emerald-500 mx-auto" />
                <p className="font-bold text-xs text-emerald-500 text-center">Story</p>
              </Link>
            </Block>

            {/* ── WORD LIST — col-6 row-span-4, animated VanishList ────────── */}
            <Block className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
              <VocabWordList
                initialWords={words.map((w, i) => ({
                  id: `${w.word}-${i}`,
                  word: w.word,
                  translation: w.translation,
                  learned: false,
                  favorite: false,
                }))}
              />
            </Block>

            {/* ── FLASHCARDS ───────────────────────────────────────────────── */}
            <Block
              whileHover={{ rotate: '2.5deg', scale: 1.07 }}
              className="col-span-6 md:col-span-3 bg-primary dark:bg-primary border-primary/20 p-0 min-h-[140px]"
            >
              <Link href={`/learn/${slug}/flashcards`} className="grid h-full place-content-center gap-3 p-5 min-h-[140px]">
                <Layers size={28} className="text-white mx-auto" />
                <div className="text-center">
                  <p className="font-bold text-sm text-white">Flashcards</p>
                  <p className="text-[11px] text-white/60 mt-0.5">Flip &amp; memorize</p>
                </div>
              </Link>
            </Block>

            {/* ── LISTENING CHALLENGE ──────────────────────────────────────── */}
            <Block
              whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
              className="col-span-6 md:col-span-3 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[140px]"
            >
              <button
                onClick={() => toast.info('Listening Challenge — coming soon!')}
                className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
              >
                <Headphones size={28} className="text-white mx-auto" />
                <div className="text-center">
                  <p className="font-bold text-sm text-white">Listening</p>
                  <p className="text-[11px] text-white/60 mt-0.5">Hear &amp; identify</p>
                </div>
              </button>
            </Block>

            {/* ── MONKEYTYPE ───────────────────────────────────────────────── */}
            <Block
              whileHover={{ rotate: '2.5deg', scale: 1.07 }}
              className="col-span-6 md:col-span-3 bg-indigo-600 dark:bg-indigo-700 border-indigo-500/20 p-0 min-h-[120px]"
            >
              <button
                onClick={() => toast.info('MonkeyType — coming soon!')}
                className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
              >
                <Keyboard size={26} className="text-white mx-auto" />
                <p className="font-bold text-xs text-white text-center">MonkeyType</p>
              </button>
            </Block>

            {/* ── TYPE × 3 ─────────────────────────────────────────────────── */}
            <Block
              whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
              className="col-span-6 md:col-span-3 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
            >
              <button
                onClick={() => toast.info('Type × 3 — coming soon!')}
                className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
              >
                <PenLine size={26} className="text-white mx-auto" />
                <p className="font-bold text-xs text-white text-center">Type × 3</p>
              </button>
            </Block>

            {/* ── NEXT: PHRASES ────────────────────────────────────────────── */}
            <Block
              whileHover={{ scale: 1.02 }}
              className="col-span-12 md:col-span-6 p-0 overflow-hidden border-blue-500/20 min-h-[100px]"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
            >
              <Link href={`/learn/${slug}/phrases`} className="flex items-center justify-between gap-4 px-6 py-5 h-full min-h-[100px]">
                {/* Left: flow steps */}
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                    <ArrowRight size={10} />
                    Next up
                  </span>
                  <p className="text-xl font-bold text-white leading-tight">Phrases</p>
                  {/* Progress path */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {[
                      { label: 'Vocab',   Icon: BookOpen,      done: true  },
                      { label: 'Phrases', Icon: MessageSquare, done: false },
                      { label: 'Q&A',     Icon: HelpCircle,    done: false },
                      { label: 'Story',   Icon: BookMarked,    done: false },
                    ].map((step, i) => (
                      <React.Fragment key={step.label}>
                        {i > 0 && <div className={`w-3 h-px ${step.done ? 'bg-white/60' : 'bg-white/20'}`} />}
                        <div className={`flex items-center gap-1 text-[10px] font-semibold ${step.done ? 'text-white' : i === 1 ? 'text-white' : 'text-white/35'}`}>
                          <step.Icon size={9} className={step.done ? 'text-white' : i === 1 ? 'text-white' : 'text-white/35'} />
                          <span className="hidden sm:inline">{step.label}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {/* Right: arrow */}
                <div className="shrink-0 size-10 rounded-full bg-white/15 flex items-center justify-center">
                  <ArrowRight size={18} className="text-white" />
                </div>
              </Link>
            </Block>

          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PHRASES
      ══════════════════════════════════════════════════════════════════════ */}
      {/* ── PHRASES — BENTO OVERVIEW ─────────────────────────────────────── */}
      {activity === 'phrases' && phraseMode === 'overview' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          {phrases.length === 0 ? (
            <EmptyState message="No phrases in this lesson." />
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              transition={{ staggerChildren: 0.05 }}
              className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
            >
              {/* Header */}
              <Block className="col-span-12 md:col-span-6 px-6 py-5 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div>
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full">
                    Phrases
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                    {lesson.title}
                  </h1>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{phrases.length}</p>
                  <p className="text-[11px] font-semibold text-slate-400">phrases</p>
                </div>
              </Block>

              {/* ── NAV: other activities ──────────────────────────────────── */}
              <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-primary/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/vocabulary`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <BookOpen size={22} className="text-primary mx-auto" />
                  <p className="font-bold text-xs text-primary text-center">Vocab</p>
                </Link>
              </Block>
              <Block whileHover={{ scale: 1.07, rotate: '-2.5deg' }} className="col-span-4 md:col-span-2 border-purple-500/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/qa`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <HelpCircle size={22} className="text-purple-500 mx-auto" />
                  <p className="font-bold text-xs text-purple-500 text-center">Q&amp;A</p>
                </Link>
              </Block>
              <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-emerald-500/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/story`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <BookMarked size={22} className="text-emerald-500 mx-auto" />
                  <p className="font-bold text-xs text-emerald-500 text-center">Story</p>
                </Link>
              </Block>

              {/* Phrase list */}
              <Block className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
                <PhraseList
                  phrases={phrases}
                  onPractice={() => { setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false); setPhraseMode('practice') }}
                />
              </Block>

              {/* Practice */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-blue-500 dark:bg-blue-600 border-blue-400/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => { setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false); setPhraseMode('practice') }}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <MessageSquare size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Practice</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Flip &amp; review</p>
                  </div>
                </button>
              </Block>

              {/* Listening */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => toast.info('Listening Challenge — coming soon!')}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <Headphones size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Listening</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Hear &amp; identify</p>
                  </div>
                </button>
              </Block>

              {/* MonkeyType */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-indigo-600 dark:bg-indigo-700 border-indigo-500/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('MonkeyType — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <Keyboard size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">MonkeyType</p>
                </button>
              </Block>

              {/* Type × 3 */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('Type × 3 — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <PenLine size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">Type × 3</p>
                </button>
              </Block>

              {/* Next: Q&A */}
              <Block
                whileHover={{ scale: 1.02 }}
                className="col-span-12 md:col-span-6 p-0 overflow-hidden border-purple-500/20 min-h-[100px]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
              >
                <Link href={`/learn/${slug}/qa`} className="flex items-center justify-between gap-4 px-6 py-5 h-full min-h-[100px]">
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      <ArrowRight size={10} />
                      Next up
                    </span>
                    <p className="text-xl font-bold text-white leading-tight">Q&amp;A</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {[
                        { label: 'Vocab',   Icon: BookOpen,      done: true  },
                        { label: 'Phrases', Icon: MessageSquare, done: true  },
                        { label: 'Q&A',     Icon: HelpCircle,    done: false },
                        { label: 'Story',   Icon: BookMarked,    done: false },
                      ].map((step, i) => (
                        <React.Fragment key={step.label}>
                          {i > 0 && <div className={`w-3 h-px ${step.done ? 'bg-white/60' : 'bg-white/20'}`} />}
                          <div className={`flex items-center gap-1 text-[10px] font-semibold ${step.done ? 'text-white' : i === 2 ? 'text-white' : 'text-white/35'}`}>
                            <step.Icon size={9} className={step.done ? 'text-white' : i === 2 ? 'text-white' : 'text-white/35'} />
                            <span className="hidden sm:inline">{step.label}</span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 size-10 rounded-full bg-white/15 flex items-center justify-center">
                    <ArrowRight size={18} className="text-white" />
                  </div>
                </Link>
              </Block>
            </motion.div>
          )}
        </div>
      )}

      {/* ── PHRASES — PRACTICE MODE ──────────────────────────────────────────── */}
      {activity === 'phrases' && phraseMode === 'practice' && (
        <div className="flex-1 flex flex-col items-center p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {phraseDone ? (
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
              {/* Back + progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setPhraseMode('overview')}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-blue-500 transition-colors flex items-center gap-1"
                  >
                    ← Phrases
                  </button>
                  <span className="text-[11px] font-bold text-blue-500">
                    {phraseIndex + 1} / {phrases.length}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-blue-500/20">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-blue-500"
                    style={{ width: `${(phraseIndex / phrases.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Phrase card */}
              <div
                className="w-full flex-1 max-h-72 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-5 p-8 text-center select-none cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: phraseRevealed ? '#3b82f614' : surfaceBg,
                  border: `1.5px solid ${phraseRevealed ? '#3b82f645' : borderDefault}`,
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
                    <p className="text-lg font-semibold text-blue-500">
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
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform bg-blue-500"
                  style={{ boxShadow: '0 8px 24px #3b82f635' }}
                >
                  {phraseIndex + 1 >= phrases.length ? 'All done!' : 'Next phrase'} <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Q&A — BENTO OVERVIEW ─────────────────────────────────────────────── */}
      {activity === 'qa' && qaMode === 'overview' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          {questions.length === 0 ? (
            <EmptyState message="No questions in this lesson." />
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              transition={{ staggerChildren: 0.05 }}
              className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
            >
              {/* Header */}
              <Block className="col-span-12 md:col-span-6 px-6 py-5 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div>
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-purple-500 bg-purple-500/10 px-2.5 py-1 rounded-full">
                    Q&amp;A
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                    {lesson.title}
                  </h1>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{questions.length}</p>
                  <p className="text-[11px] font-semibold text-slate-400">questions</p>
                </div>
              </Block>

              {/* ── NAV: other activities ──────────────────────────────────── */}
              <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-primary/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/vocabulary`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <BookOpen size={22} className="text-primary mx-auto" />
                  <p className="font-bold text-xs text-primary text-center">Vocab</p>
                </Link>
              </Block>
              <Block whileHover={{ scale: 1.07, rotate: '-2.5deg' }} className="col-span-4 md:col-span-2 border-blue-500/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/phrases`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <MessageSquare size={22} className="text-blue-500 mx-auto" />
                  <p className="font-bold text-xs text-blue-500 text-center">Phrases</p>
                </Link>
              </Block>
              <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-emerald-500/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/story`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <BookMarked size={22} className="text-emerald-500 mx-auto" />
                  <p className="font-bold text-xs text-emerald-500 text-center">Story</p>
                </Link>
              </Block>

              {/* Questions list */}
              <Block className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
                <QAQuestionList
                  questions={questions}
                  onStartQuiz={() => { setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false); setQaMode('quiz') }}
                />
              </Block>

              {/* Start Quiz */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-purple-600 dark:bg-purple-700 border-purple-500/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => { setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false); setQaMode('quiz') }}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <HelpCircle size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Start Quiz</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Test yourself</p>
                  </div>
                </button>
              </Block>

              {/* Listening */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => toast.info('Listening Challenge — coming soon!')}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <Headphones size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Listening</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Hear &amp; identify</p>
                  </div>
                </button>
              </Block>

              {/* MonkeyType */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-indigo-600 dark:bg-indigo-700 border-indigo-500/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('MonkeyType — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <Keyboard size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">MonkeyType</p>
                </button>
              </Block>

              {/* Type × 3 */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('Type × 3 — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <PenLine size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">Type × 3</p>
                </button>
              </Block>

              {/* Next: Story */}
              <Block
                whileHover={{ scale: 1.02 }}
                className="col-span-12 md:col-span-6 p-0 overflow-hidden border-emerald-500/20 min-h-[100px]"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <Link href={`/learn/${slug}/story`} className="flex items-center justify-between gap-4 px-6 py-5 h-full min-h-[100px]">
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      <ArrowRight size={10} />
                      Next up
                    </span>
                    <p className="text-xl font-bold text-white leading-tight">Story</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {[
                        { label: 'Vocab',   Icon: BookOpen,      done: true  },
                        { label: 'Phrases', Icon: MessageSquare, done: true  },
                        { label: 'Q&A',     Icon: HelpCircle,    done: true  },
                        { label: 'Story',   Icon: BookMarked,    done: false },
                      ].map((step, i) => (
                        <React.Fragment key={step.label}>
                          {i > 0 && <div className={`w-3 h-px ${step.done ? 'bg-white/60' : 'bg-white/20'}`} />}
                          <div className={`flex items-center gap-1 text-[10px] font-semibold ${step.done ? 'text-white' : 'text-white'}`}>
                            <step.Icon size={9} />
                            <span className="hidden sm:inline">{step.label}</span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 size-10 rounded-full bg-white/15 flex items-center justify-center">
                    <ArrowRight size={18} className="text-white" />
                  </div>
                </Link>
              </Block>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Q&A — QUIZ MODE ──────────────────────────────────────────────────── */}
      {activity === 'qa' && qaMode === 'quiz' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-4 max-w-lg mx-auto w-full">
          {qaDone ? (
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
              {/* Back + progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setQaMode('overview')}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-purple-500 transition-colors flex items-center gap-1"
                  >
                    ← Q&amp;A
                  </button>
                  <span className="text-[11px] font-bold text-purple-500">
                    {qIndex + 1} / {questions.length} · {correctCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-purple-500/20">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-purple-500"
                    style={{ width: `${(qIndex / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-3xl p-5 border shadow-sm bg-purple-500/10 border-purple-500/25">
                <p className="text-base md:text-lg font-bold leading-snug">{questions[qIndex].question}</p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2.5 flex-1">
                {questions[qIndex].options.map((option, i) => {
                  const isSelected = selected === i
                  const isCorrect  = i === questions[qIndex].correct
                  const show       = checked

                  let borderColor = borderDefault
                  let bgColor     = surfaceBg
                  let textColor   = 'inherit'
                  let badgeBg     = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'
                  let badgeColor  = isDark ? '#94a3b8' : '#94a3b8'

                  if (!show && isSelected) {
                    borderColor = '#8b5cf6'; bgColor = '#8b5cf614'
                    badgeBg = '#8b5cf6'; badgeColor = '#fff'
                  } else if (show && isCorrect) {
                    borderColor = COLOR_CORRECT; bgColor = correctBg; textColor = correctText
                    badgeBg = COLOR_CORRECT; badgeColor = '#fff'
                  } else if (show && isSelected && !isCorrect) {
                    borderColor = COLOR_INCORRECT; bgColor = incorrectBg; textColor = incorrectText
                    badgeBg = COLOR_INCORRECT; badgeColor = '#fff'
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !checked && setSelected(i)}
                      disabled={checked}
                      className="w-full text-left px-4 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all flex items-center gap-3 active:scale-[0.98]"
                      style={{ borderColor, backgroundColor: bgColor, color: textColor, opacity: show && !isSelected && !isCorrect ? 0.45 : 1 }}
                    >
                      <span
                        className="size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                      >
                        {show && isCorrect ? <Check size={13} /> : show && isSelected && !isCorrect ? <X size={13} /> : String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {checked && questions[qIndex].explanation && (
                <div className="rounded-2xl p-4 border text-sm leading-relaxed bg-purple-500/[0.08] border-purple-500/30 text-purple-600 dark:text-purple-400">
                  {questions[qIndex].explanation}
                </div>
              )}

              {/* CTA */}
              {!checked ? (
                <button
                  onClick={() => selected !== null && setChecked(true)}
                  disabled={selected === null}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 bg-purple-600"
                  style={{ boxShadow: selected !== null ? '0 8px 24px #8b5cf635' : 'none' }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={() => {
                    const correct = selected === questions[qIndex].correct
                    if (correct) setCorrectCount(c => c + 1)
                    if (qIndex + 1 >= questions.length) { setQaDone(true) }
                    else { setQIndex(i => i + 1); setSelected(null); setChecked(false) }
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
          STORY — BENTO
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'story' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          {!content.story ? (
            <EmptyState message="No story in this lesson." />
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              transition={{ staggerChildren: 0.05 }}
              className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
            >
              {/* Header */}
              <Block className="col-span-12 md:col-span-6 px-6 py-5 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div>
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    Story
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                    {lesson.title}
                  </h1>
                </div>
                {(content.highlightedWords?.length ?? 0) > 0 && (
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{content.highlightedWords!.length}</p>
                    <p className="text-[11px] font-semibold text-slate-400">key words</p>
                  </div>
                )}
              </Block>

              {/* ── NAV: other activities ──────────────────────────────────── */}
              <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-primary/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/vocabulary`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <BookOpen size={22} className="text-primary mx-auto" />
                  <p className="font-bold text-xs text-primary text-center">Vocab</p>
                </Link>
              </Block>
              <Block whileHover={{ scale: 1.07, rotate: '-2.5deg' }} className="col-span-4 md:col-span-2 border-blue-500/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/phrases`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <MessageSquare size={22} className="text-blue-500 mx-auto" />
                  <p className="font-bold text-xs text-blue-500 text-center">Phrases</p>
                </Link>
              </Block>
              <Block whileHover={{ scale: 1.07, rotate: '2.5deg' }} className="col-span-4 md:col-span-2 border-purple-500/40 p-0 min-h-[96px]">
                <Link href={`/learn/${slug}/qa`} className="grid h-full place-content-center gap-1.5 p-4 min-h-[96px]">
                  <HelpCircle size={22} className="text-purple-500 mx-auto" />
                  <p className="font-bold text-xs text-purple-500 text-center">Q&amp;A</p>
                </Link>
              </Block>

              {/* Story text — left col, row 2 */}
              <Block className="col-span-12 md:col-span-6 md:col-start-1 p-6 md:p-8 overflow-y-auto shadow-[0_2px_8px_rgba(0,0,0,0.05)]" style={{ maxHeight: '36rem' }}>
                <TextGenerateEffect
                  words={content.story}
                  duration={0.4}
                  filter={true}
                  highlightedWords={content.highlightedWords}
                  highlightColor="#10b981"
                />
              </Block>

              {/* Listening — right col, row 2 (grid-flow-dense backfills the gap) */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-4 md:col-span-6 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('Listening Challenge — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <Headphones size={26} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Listening</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Hear the story</p>
                  </div>
                </button>
              </Block>

              {/* Key words — left col, row 3 */}
              {(content.highlightedWords?.length ?? 0) > 0 && (
                <Block className="col-span-12 md:col-span-6 md:col-start-1 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Key words</p>
                  <div className="flex flex-wrap gap-2">
                    {content.highlightedWords!.map((w, i) => (
                      <span
                        key={i}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </Block>
              )}

              {/* MonkeyType — right col, row 3 */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-4 md:col-span-6 bg-indigo-600 dark:bg-indigo-700 border-indigo-500/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('MonkeyType — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <Keyboard size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">MonkeyType</p>
                </button>
              </Block>

              {/* Write your sentence — left col, row 4 */}
              <Block className="col-span-12 md:col-span-6 md:col-start-1 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Write your own sentence</p>
                <textarea
                  value={storyInput}
                  onChange={e => setStoryInput(e.target.value)}
                  placeholder="Try using one of the key words…"
                  className="w-full p-3 rounded-2xl border-2 border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-sm resize-none h-24 focus:outline-none focus:border-emerald-500/60 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </Block>

              {/* Type × 3 — right col, row 4 */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-4 md:col-span-6 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('Type × 3 — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <PenLine size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">Type × 3</p>
                </button>
              </Block>

              {/* Finish lesson */}
              <Block
                whileHover={{ scale: 1.015 }}
                className="col-span-12 p-0 overflow-hidden border-primary/20 min-h-[80px]"
                style={{ background: 'linear-gradient(135deg, #ff8052 0%, #ff5c2b 100%)' }}
              >
                <button
                  onClick={() => handleFinishLesson(100)}
                  disabled={saving}
                  className="w-full flex items-center justify-between gap-4 px-8 py-5 disabled:opacity-60"
                >
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">All done!</span>
                    <span className="text-xl font-bold text-white">{saving ? 'Saving…' : 'Finish Lesson 🎉'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold">
                      {[BookOpen, MessageSquare, HelpCircle, BookMarked].map((Icon, i) => (
                        <Icon key={i} size={14} className="text-white/80" />
                      ))}
                    </div>
                    <div className="shrink-0 size-10 rounded-full bg-white/15 flex items-center justify-center">
                      <Check size={18} className="text-white" />
                    </div>
                  </div>
                </button>
              </Block>
            </motion.div>
          )}
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
                    backgroundColor: arrangeIsCorrect ? correctBg : incorrectBg,
                    borderColor: arrangeIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT,
                    color: arrangeIsCorrect ? correctText : incorrectText,
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
                        borderColor: isPicked ? borderDefault : `${currentMeta.accent}60`,
                        backgroundColor: isPicked ? (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc') : surfaceBg,
                        color: isPicked ? (isDark ? '#475569' : '#cbd5e1') : 'inherit',
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
                style={{ backgroundColor: `${currentMeta.accent}10`, borderColor: `${currentMeta.accent}25` }}
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
                    backgroundColor: translateIsCorrect ? correctBg : incorrectBg,
                    borderColor: translateIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT,
                    color: translateIsCorrect ? correctText : incorrectText,
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
