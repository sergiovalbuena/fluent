'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Volume2, ArrowRight, Check, X, RotateCcw,
  BookOpen, MessageSquare, HelpCircle, BookMarked,
} from 'lucide-react'
import Link from 'next/link'
import { AppTopbar } from '@/components/layout/app-topbar'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

interface LessonContent {
  words?: VocabWord[]
  phrases?: Phrase[]
  questions?: QAQuestion[]
  story?: string
  highlightedWords?: string[]
}

interface RawContent {
  items?: Array<{ word?: string; translation?: string; icon?: string; example?: string; phrase?: string }>
  questions?: Array<{ question: string; options: string[]; correct: string | number; explanation?: string }>
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
  return {}
}

const ACTIVITIES = [
  { key: 'vocabulary', label: 'Vocab',   Icon: BookOpen,      accent: '#ff8052', light: '#fff4f0', ring: 'ring-orange-300'  },
  { key: 'phrases',    label: 'Phrases',  Icon: MessageSquare, accent: '#3b82f6', light: '#eff6ff', ring: 'ring-blue-300'    },
  { key: 'qa',         label: 'Quiz',     Icon: HelpCircle,    accent: '#8b5cf6', light: '#f5f3ff', ring: 'ring-violet-300'  },
  { key: 'story',      label: 'Story',    Icon: BookMarked,    accent: '#10b981', light: '#ecfdf5', ring: 'ring-emerald-300' },
]

// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <p className="text-muted-foreground text-center text-sm">{message}</p>
    </div>
  )
}

function CompletionCard({
  icon, title, subtitle, nextLabel, nextHref, onRestart,
}: {
  icon: string; title: string; subtitle: string
  nextLabel: string; nextHref: string; onRestart: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 w-full text-center py-10 px-6">
      <div className="text-7xl">{icon}</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href={nextHref} className="block">
          <button className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25">
            {nextLabel} <ArrowRight size={16} />
          </button>
        </Link>
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
  const params = useParams()
  const router = useRouter()
  const slug     = params.slug     as string
  const activity = params.activity as string

  const [lesson,   setLesson]   = useState<{ title: string; content: LessonContent } | null>(null)
  const [lessonId, setLessonId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [loading,  setLoading]  = useState(true)

  // Vocabulary
  const [vocabIndex,   setVocabIndex]   = useState(0)
  const [vocabFlipped, setVocabFlipped] = useState(false)

  // Phrases
  const [phraseIndex,    setPhraseIndex]    = useState(0)
  const [phraseRevealed, setPhraseRevealed] = useState(false)
  const [phraseDone,     setPhraseDone]     = useState(false)

  // Q&A
  const [qIndex,        setQIndex]        = useState(0)
  const [selected,      setSelected]      = useState<number | null>(null)
  const [checked,       setChecked]       = useState(false)
  const [correctCount,  setCorrectCount]  = useState(0)
  const [qaDone,        setQaDone]        = useState(false)

  // Story
  const [storyInput, setStoryInput] = useState('')

  // Reset per-activity state when route changes
  useEffect(() => {
    setVocabIndex(0); setVocabFlipped(false)
    setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false)
    setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false)
    setStoryInput('')
  }, [activity])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      let languageCode: string | null = null
      if (user) {
        const { data: activeLang } = await supabase
          .from('user_languages')
          .select('language_code')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
        languageCode = activeLang?.language_code ?? null
      }

      let mq = supabase.from('modules').select('id').eq('slug', slug)
      if (languageCode) mq = mq.eq('language_code', languageCode)
      const { data: mod } = await mq.limit(1).maybeSingle()

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

  async function handleFinishLesson() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_progress').upsert({
      user_id: user.id, lesson_id: lessonId, module_id: moduleId,
      completed_at: new Date().toISOString(), score: 100, attempts: 1,
    }, { onConflict: 'user_id,lesson_id' })
    toast.success('Lesson completed! Great job! 🎉')
    router.push(`/learn/${slug}`)
  }

  const activityIdx  = ACTIVITIES.findIndex(a => a.key === activity)
  const currentMeta  = ACTIVITIES[activityIdx]
  const nextActivity = ACTIVITIES[activityIdx + 1] ?? null

  const nextHref  = nextActivity ? `/learn/${slug}/${nextActivity.key}` : `/learn/${slug}`
  const nextLabel = nextActivity ? `${nextActivity.label}` : 'Back to Module'

  // ── Loading ──
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

  const content   = lesson.content
  const words     = content.words     ?? []
  const phrases   = content.phrases   ?? []
  const questions = content.questions ?? []

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      <AppTopbar back={{ href: `/learn/${slug}`, label: lesson.title }} />

      {/* ── Activity stepper ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-black/5 dark:border-white/5 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center">
          {ACTIVITIES.map((a, i) => {
            const isCurrent = a.key === activity
            const isPast    = i < activityIdx
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
                      backgroundColor: isCurrent ? a.accent : isPast ? '#22c55e' : undefined,
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
                    style={{ color: isCurrent ? a.accent : isPast ? '#22c55e' : undefined }}
                  >
                    {a.label}
                  </span>
                </Link>
                {i < ACTIVITIES.length - 1 && (
                  <div
                    className="flex-1 h-px mx-2"
                    style={{ backgroundColor: i < activityIdx ? '#86efac' : '#e2e8f0' }}
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
              nextHref={nextHref}
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

              {/* CTA buttons — fade in when flipped */}
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
              nextHref={nextHref}
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

              {/* Phrase card — tap to reveal */}
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
              nextHref={nextHref}
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
                    borderColor = '#22c55e'; bgColor = '#f0fdf4'; textColor = '#15803d'
                    badgeBg     = '#22c55e'; badgeColor = '#fff'
                  } else if (show && isSelected && !isCorrect) {
                    borderColor = '#ef4444'; bgColor = '#fef2f2'; textColor = '#b91c1c'
                    badgeBg     = '#ef4444'; badgeColor = '#fff'
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
                    backgroundColor: selected === questions[qIndex].correct ? '#22c55e' : '#64748b',
                    boxShadow: selected === questions[qIndex].correct ? '0 8px 20px #22c55e30' : 'none',
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
              {/* Story text with animated word reveal */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 shadow-sm p-6 md:p-8">
                <TextGenerateEffect
                  words={content.story}
                  duration={0.4}
                  filter={true}
                  highlightedWords={content.highlightedWords}
                  highlightColor={currentMeta.accent}
                />
              </div>

              {/* Key words glossary */}
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

              {/* Writing prompt */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Write your own sentence
                </label>
                <textarea
                  value={storyInput}
                  onChange={e => setStoryInput(e.target.value)}
                  placeholder="Try using one of the key words…"
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none h-24 focus:outline-none transition-colors"
                  style={{ '--tw-ring-color': currentMeta.accent } as React.CSSProperties}
                  onFocus={e => (e.target.style.borderColor = `${currentMeta.accent}80`)}
                  onBlur={e => (e.target.style.borderColor = '')}
                />
              </div>
            </>
          ) : (
            <EmptyState message="No story in this lesson." />
          )}

          <button
            onClick={handleFinishLesson}
            className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25 mt-auto"
          >
            Finish Lesson 🎉
          </button>
        </div>
      )}
    </div>
  )
}
