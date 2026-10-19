'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flame, Gem, Headphones, RotateCcw, Trophy, Volume2, X, Zap } from 'lucide-react'
import { ScoreRing, Stat } from '@/components/practice/score'
import { GemChip, RewardChips } from '@/components/practice/reward-chips'
import { Highlighted, Rich, useGrammarContext } from '@/components/grammar/rich-text'
import { BLANK, MASTERY, MIXED_SIZE, REWARDS, checkAnswer, fillPrompt, itemOptions, spokenText, type ExerciseItem, type GrammarExercise, type GrammarModule } from '@/lib/grammar'
import { shuffle } from '@/lib/verb-quiz'
import { speak } from '@/lib/languages'
import { createClient } from '@/lib/supabase/client'
import { grantGrammarRewards, type GrammarRewardResult } from '@/lib/grammar-rewards'
import { saveScore } from '@/lib/grammar-progress'
import { cn } from '@/lib/utils'

// One run of a grammar exercise (or the module's mixed review): questions one at a
// time, misses repeated once at the end, then the score, rewards and mistakes.
// Used full page (/grammar/[slug]/practice) and inline, under each section.

type Status = 'idle' | 'correct' | 'almost' | 'wrong'
type Question = { key: string; ex: GrammarExercise; item: ExerciseItem; options: string[]; words: string[] }

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'ë', 'œ']

function toQuestion(ex: GrammarExercise, item: ExerciseItem, i: number): Question {
  // Shared options keep their order (le / la, Same / Different…); per-item ones are shuffled
  const options = item.options ? shuffle(item.options) : itemOptions(ex, item)
  let words = item.words ? shuffle(item.words) : []
  // Never start an order item already solved
  if (words.length > 1 && words.join(' ') === item.answer) words = [...words.slice(1), words[0]]
  return { key: `${ex.id}:${i}`, ex, item, options, words }
}

function buildQuestions(mod: GrammarModule, exId: string): Question[] {
  if (exId === 'mixed') {
    // Items that only make sense in sequence (a verdict at the end of a story) are left out
    const all = mod.exercises.flatMap(e => e.items.flatMap((it, i) => (it.mixed === false ? [] : [toQuestion(e, it, i)])))
    return shuffle(all).slice(0, MIXED_SIZE)
  }
  const ex = mod.exercises.find(e => e.id === exId)
  return ex ? ex.items.map((it, i) => toQuestion(ex, it, i)) : []
}

type Props = {
  module: GrammarModule
  /** An exercise id, or 'mixed' for the module review */
  exId: string
  variant: 'page' | 'inline'
  /** Called with the score after a (non-review) round is saved */
  onScore?: (exId: string, pct: number) => void
  /** Inline: close the session */
  onClose?: () => void
  /** Page: where "back to the module" goes */
  backHref?: string
  /** Inline: the next step, offered once the round is over */
  onNext?: () => void
  nextLabel?: string
}

export function ExerciseSession({ module: mod, exId, variant, onScore, onClose, backHref, onNext, nextLabel }: Props) {
  const t = useTranslations('grammar')
  const { languageCode } = useGrammarContext()
  const inline = variant === 'inline'
  const isMixed = exId === 'mixed'

  const [queue, setQueue] = useState<Question[]>(() => buildQuestions(mod, exId))
  const [roundSize, setRoundSize] = useState(queue.length)
  const [pos, setPos] = useState(0)
  const [isReview, setIsReview] = useState(false)
  const [finished, setFinished] = useState(false)
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({})
  const [requeued, setRequeued] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<Status>('idle')
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [order, setOrder] = useState<number[]>([])
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  // undefined: being credited · null: nothing credited (signed out)
  const [rewards, setRewards] = useState<GrammarRewardResult | null | undefined>(undefined)
  const [record, setRecord] = useState<{ previous: number | undefined; pct: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const begin = useCallback((questions: Question[], review: boolean) => {
    setQueue(questions)
    setRoundSize(questions.length)
    setPos(0)
    setIsReview(review)
    setFinished(false)
    setFirstTry({})
    setRequeued(new Set())
    setStatus('idle')
    setPicked(null)
    setTyped('')
    setOrder([])
    setStreak(0)
    setBestStreak(0)
    setRewards(undefined)
    setRecord(null)
  }, [])

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])

  const current = queue[pos] as Question | undefined
  const say = current ? spokenText(current.ex, current.item) : null

  // Listening items play on their own
  useEffect(() => {
    if (!finished && current?.ex.listen && status === 'idle' && say) {
      const id = setTimeout(() => speak(say, languageCode), 250)
      return () => clearTimeout(id)
    }
  }, [finished, current, status, say, languageCode])

  const finish = useCallback(async (results: Record<string, boolean>, review: boolean) => {
    setFinished(true)
    if (inline) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    if (review) return
    const total = Object.keys(results).length
    const pct = Math.round((Object.values(results).filter(Boolean).length / Math.max(total, 1)) * 100)
    const supabase = createClient()
    let before: Record<string, number> = {}
    let after: Record<string, number> = {}
    if (!isMixed) {
      ;({ before, after } = await saveScore(supabase, languageCode, mod.slug, exId, pct))
      setRecord({ previous: before[exId], pct })
      onScore?.(exId, pct)
    }
    setRewards(await grantGrammarRewards(supabase, {
      slug: mod.slug, exId, pct, mixed: isMixed, before, after, exerciseIds: mod.exercises.map(e => e.id),
    }))
  }, [mod.slug, mod.exercises, exId, isMixed, languageCode, onScore, inline])

  const next = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = null
    if (pos + 1 >= queue.length) {
      finish(firstTry, isReview)
      return
    }
    setPos(pos + 1)
    setStatus('idle')
    setPicked(null)
    setTyped('')
    setOrder([])
  }, [pos, queue.length, finish, firstTry, isReview])

  const nextRef = useRef(next)
  useEffect(() => { nextRef.current = next }, [next])

  function answer(result: Exclude<Status, 'idle'>, option: string | null) {
    if (!current || status !== 'idle') return
    const ok = result !== 'wrong'
    setStatus(result)
    setPicked(option)
    if (!(current.key in firstTry)) setFirstTry(r => ({ ...r, [current.key]: ok }))
    if (say) speak(say, languageCode)
    if (ok) {
      setStreak(s => {
        setBestStreak(b => Math.max(b, s + 1))
        return s + 1
      })
      // Explanations stay on screen until the learner continues
      if (result === 'correct' && !current.item.explain) {
        advanceTimer.current = setTimeout(() => advanceTimer.current && nextRef.current(), 1300)
      }
    } else {
      setStreak(0)
      // A miss comes back once at the end
      if (!requeued.has(current.key)) {
        setRequeued(s => new Set(s).add(current.key))
        setQueue(q => [...q, toQuestion(current.ex, current.item, Number(current.key.split(':')[1]))])
      }
    }
  }

  function submitTyped() {
    if (!current) return
    if (status !== 'idle') { next(); return }
    if (!typed.trim()) return
    answer(checkAnswer(typed, current.item), null)
  }

  function submitOrder() {
    if (!current) return
    const sentence = order.map(i => current.words[i]).join(' ')
    answer(checkAnswer(sentence, current.item) === 'wrong' ? 'wrong' : 'correct', sentence)
  }

  function insertAccent(ch: string) {
    const el = inputRef.current
    if (!el || status !== 'idle') return
    const start = el.selectionStart ?? typed.length
    const end = el.selectionEnd ?? typed.length
    setTyped(typed.slice(0, start) + ch + typed.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + ch.length, start + ch.length)
    })
  }

  // Keyboard (full page only, where it's the only session): 1–n answer, Enter continues
  useEffect(() => {
    if (inline || finished || !current) return
    function onKey(e: KeyboardEvent) {
      if (!current) return
      if (current.ex.kind === 'choice' && status === 'idle' && /^[1-9]$/.test(e.key)) {
        const opt = current.options[Number(e.key) - 1]
        if (opt) answer(opt === current.item.answer ? 'correct' : 'wrong', opt)
      } else if (e.key === 'Enter' && status !== 'idle' && current.ex.kind !== 'type') {
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!finished && current?.ex.kind === 'type' && status === 'idle') inputRef.current?.focus({ preventScroll: inline })
  }, [finished, current, status, pos, inline])

  const title = isMixed ? t('mixed') : mod.exercises.find(e => e.id === exId)?.title ?? t('practice')

  // ── Results ─────────────────────────────────────────────────────────────────
  if (finished) {
    const results = Object.entries(firstTry)
    const correct = results.filter(([, ok]) => ok).length
    const pct = Math.round((correct / Math.max(results.length, 1)) * 100)
    const missed = queue.slice(0, roundSize).filter(q => firstTry[q.key] === false)
    const headline = pct >= 80 ? t('result_great') : pct >= 50 ? t('result_good') : t('result_keep')
    const newBest = record && record.previous !== undefined && record.pct > record.previous
    const masteredNow = record && record.pct >= MASTERY && (record.previous ?? 0) < MASTERY
    const retryMistakes = () => begin(shuffle(missed).map(q => toQuestion(q.ex, q.item, Number(q.key.split(':')[1]))), true)
    const repeat = () => begin(buildQuestions(mod, exId), false)

    return (
      <motion.div ref={rootRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn('flex w-full flex-col gap-4', !inline && 'mx-auto max-w-xl')}>
        <section className={cn(
          'flex items-center gap-4 rounded-3xl bg-white dark:bg-[#202638]',
          inline ? 'flex-col p-5 text-center sm:flex-row sm:text-left' : 'flex-col border border-black/[0.04] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/[0.05]',
        )}>
          {!inline && <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</p>}
          <ScoreRing pct={pct} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{headline}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('score', { correct, total: results.length })}</p>
            </div>
            {!isReview && (masteredNow || newBest) && (
              <span className={cn(
                'flex w-fit items-center gap-1.5 self-center rounded-full px-3 py-1 text-xs font-bold',
                inline && 'sm:self-start',
                masteredNow ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
              )}>
                <Trophy size={13} /> {masteredNow ? t('mastered_now') : t('new_best')}
              </span>
            )}
          </div>
          <div className={cn('grid grid-cols-3 gap-2', inline ? 'w-full sm:w-64' : 'w-full')}>
            <Stat icon={<Flame size={14} className="text-orange-500" />} value={String(bestStreak)} label={t('best_streak')} />
            <Stat icon={<Zap size={14} className="text-primary" />} value={isReview || rewards === null ? '—' : rewards ? `+${rewards.xp}` : '…'} label="XP" />
            <Stat icon={<Gem size={14} className="text-sky-500" />} value={isReview || rewards === null ? '—' : rewards ? `+${rewards.gems + rewards.moduleGems}` : '…'} label={t('gems')} />
          </div>
        </section>

        {isReview
          ? <p className="text-center text-xs text-slate-400">{t('review_no_rewards')}</p>
          : rewards && <RewardBreakdown r={rewards} pct={pct} mixed={isMixed} />}

        {missed.length > 0 && (
          <section className={cn('rounded-3xl bg-white p-4 dark:bg-[#202638]', !inline && 'border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/[0.05]')}>
            <h4 className="mb-1 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('to_review')}</h4>
            <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {missed.map(q => {
                const text = spokenText(q.ex, q.item)
                return (
                  <li key={q.key}>
                    <button
                      type="button"
                      onClick={() => text && speak(text, languageCode)}
                      className="group flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white"><Highlighted text={resolvedText(q)} /></span>
                        {isMixed && <span className="block text-xs text-slate-500 dark:text-slate-400">{q.ex.title}</span>}
                      </span>
                      {text && <Volume2 size={14} className="shrink-0 text-slate-300 group-hover:text-primary" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {missed.length === 0 && !inline && (
          <p className="text-center text-sm text-slate-500">{t('no_mistakes')}</p>
        )}

        <div className={cn('flex gap-2', inline ? 'flex-col sm:flex-row' : 'flex-col')}>
          {missed.length > 0 && (
            <button type="button" onClick={retryMistakes} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-bold text-white shadow-lg shadow-primary/25">
              <RotateCcw size={16} /> {t('retry_mistakes', { n: missed.length })}
            </button>
          )}
          {inline && onNext && missed.length === 0 && (
            <button type="button" onClick={onNext} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-bold text-white shadow-lg shadow-primary/25">
              {nextLabel ?? t('next')}
            </button>
          )}
          <button
            type="button"
            onClick={repeat}
            className={cn(
              'h-12 flex-1 rounded-2xl px-4 font-bold transition-colors',
              missed.length > 0 || (inline && onNext)
                ? 'border border-black/[0.08] bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-200'
                : 'bg-primary text-white shadow-lg shadow-primary/25',
            )}
          >
            {t('play_again')}
          </button>
          {inline ? (
            <button type="button" onClick={onClose} className="h-12 rounded-2xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
              {t('close')}
            </button>
          ) : backHref && (
            <a href={backHref} className="flex h-10 items-center justify-center text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
              {t('back_to_module')}
            </a>
          )}
        </div>
      </motion.div>
    )
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  if (!current) return null
  const { ex, item } = current
  const progress = (pos + (status === 'idle' ? 0 : 1)) / queue.length
  const isRetry = pos >= roundSize
  const shown = status !== 'idle'
  const hidePrompt = ex.listen && !shown
  const longOptions = current.options.some(o => o.length > 18)

  return (
    <div ref={rootRef} className={cn('flex w-full flex-col', inline ? 'gap-3' : 'mx-auto max-w-xl gap-4')}>
      {/* Progress */}
      <div className="flex items-center gap-3">
        {inline ? (
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        ) : (
          <a href={backHref} aria-label={t('quit')} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/[0.06]">
            <X size={18} />
          </a>
        )}
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
        <span className="w-12 text-right text-xs font-bold tabular-nums text-slate-500">{Math.min(pos + 1, queue.length)}/{queue.length}</span>
        <AnimatePresence>
          {streak >= 2 && (
            <motion.span
              key={streak}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400"
            >
              <Flame size={12} /> {streak}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${pos}-${current.key}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3"
        >
          {/* Question */}
          <div className={cn('rounded-3xl bg-white px-5 text-center dark:bg-[#202638]', inline ? 'py-5' : 'border border-black/[0.04] py-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/[0.05]')}>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {(isMixed || !inline) && <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">{ex.title}</span>}
              {isRetry && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">{t('again')}</span>}
            </div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400"><Rich text={ex.instructions} /></p>

            {ex.listen && (
              <button
                type="button"
                onClick={() => say && speak(say, languageCode)}
                aria-label={t('replay')}
                className="mx-auto mt-4 flex size-16 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 active:scale-95"
              >
                <Headphones size={26} />
              </button>
            )}

            {!hidePrompt && item.prompt && (
              <Prompt prompt={item.prompt} answer={shown ? item.answer : null} status={status} small={inline} />
            )}
            {shown && ex.listen && !item.prompt && (
              <p className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{item.say ?? item.answer}</p>
            )}
          </div>

          {/* Answer */}
          {ex.kind === 'choice' && (
            <div className={cn('grid grid-cols-1 gap-2', !longOptions && current.options.length !== 3 && 'sm:grid-cols-2')}>
              {current.options.map((opt, i) => {
                const isAnswer = opt === item.answer
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={shown}
                    onClick={() => answer(isAnswer ? 'correct' : 'wrong', opt)}
                    animate={shown && picked === opt && !isAnswer ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.35 }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left text-base font-semibold transition-colors dark:bg-[#202638]',
                      !shown && 'border-black/[0.06] text-slate-800 hover:border-primary/50 hover:bg-primary/[0.03] dark:border-white/[0.08] dark:text-slate-100',
                      shown && isAnswer && 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                      shown && !isAnswer && picked === opt && 'border-red-400 bg-red-500/10 text-red-600 dark:text-red-300',
                      shown && !isAnswer && picked !== opt && 'border-black/[0.04] text-slate-300 dark:border-white/[0.05] dark:text-slate-600',
                    )}
                  >
                    {!inline && <span className="hidden size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-400 dark:bg-white/[0.06] sm:flex">{i + 1}</span>}
                    <span className="min-w-0 flex-1">{opt}</span>
                    {shown && isAnswer && <Check size={18} className="shrink-0" />}
                  </motion.button>
                )
              })}
            </div>
          )}

          {ex.kind === 'type' && (
            <form onSubmit={e => { e.preventDefault(); submitTyped() }} className="flex flex-col gap-2">
              <input
                ref={inputRef}
                value={typed}
                onChange={e => setTyped(e.target.value)}
                readOnly={shown}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t('type_placeholder')}
                className={cn(
                  'h-14 w-full rounded-2xl border-2 bg-white px-4 text-lg font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none dark:bg-[#202638] dark:text-white',
                  status === 'idle' && 'border-black/[0.08] focus:border-primary dark:border-white/[0.1]',
                  status === 'correct' && 'border-emerald-500',
                  status === 'almost' && 'border-amber-400',
                  status === 'wrong' && 'border-red-400 line-through decoration-red-400/60',
                )}
              />
              {!shown && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {ACCENTS.map(ch => (
                      <button
                        key={ch}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => insertAccent(ch)}
                        className="size-9 rounded-lg border border-black/[0.06] bg-white text-sm font-semibold text-slate-700 hover:border-primary/50 hover:text-primary dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => answer('wrong', null)} className="h-12 rounded-2xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
                      {t('dont_know')}
                    </button>
                    <button type="submit" disabled={!typed.trim()} className="h-12 flex-1 rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-40">
                      {t('check')}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {ex.kind === 'order' && (
            <div className="flex flex-col gap-3">
              <div className={cn(
                'flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3',
                status === 'idle' && 'border-black/[0.08] dark:border-white/[0.1]',
                status === 'correct' && 'border-emerald-500 bg-emerald-500/[0.06]',
                status === 'wrong' && 'border-red-400 bg-red-500/[0.05]',
              )}>
                {order.length === 0 && <span className="text-sm text-slate-400">{t('order_hint')}</span>}
                {order.map((wi, k) => (
                  <motion.button
                    layoutId={`w-${current.key}-${wi}`}
                    key={wi}
                    type="button"
                    disabled={shown}
                    onClick={() => setOrder(o => o.filter((_, j) => j !== k))}
                    className="rounded-xl bg-white px-3 py-2 text-base font-semibold text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.08)] dark:bg-[#202638] dark:text-white"
                  >
                    {current.words[wi]}
                  </motion.button>
                ))}
              </div>
              <div className="flex min-h-12 flex-wrap justify-center gap-2">
                {current.words.map((w, wi) => !order.includes(wi) && (
                  <motion.button
                    layoutId={`w-${current.key}-${wi}`}
                    key={wi}
                    type="button"
                    disabled={shown}
                    onClick={() => setOrder(o => [...o, wi])}
                    className="rounded-xl border-2 border-black/[0.06] bg-white px-3 py-2 text-base font-semibold text-slate-800 hover:border-primary/50 dark:border-white/[0.08] dark:bg-[#202638] dark:text-slate-100"
                  >
                    {w}
                  </motion.button>
                ))}
              </div>
              {!shown && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOrder([])} disabled={order.length === 0} className="h-12 rounded-2xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40 dark:hover:text-white">
                    {t('clear')}
                  </button>
                  <button type="button" onClick={submitOrder} disabled={order.length !== current.words.length} className="h-12 flex-1 rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-40">
                    {t('check')}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {shown && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'flex items-start gap-3 rounded-2xl px-4 py-3',
              status === 'correct' && 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
              status === 'almost' && 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
              status === 'wrong' && 'bg-red-500/10 text-red-800 dark:text-red-300',
            )}
          >
            {say && (
              <button
                type="button"
                aria-label={t('listen')}
                onClick={() => speak(say, languageCode)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-white/[0.08]"
              >
                <Volume2 size={16} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {status === 'correct' ? t('correct') : status === 'almost' ? t('almost') : t('wrong')}
                {status !== 'correct' && <span className="font-semibold"> {item.answer}</span>}
              </p>
              {item.explain && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300"><Rich text={item.explain} /></p>}
            </div>
            {(status !== 'correct' || item.explain) && (
              <button
                type="button"
                onClick={next}
                className="h-10 shrink-0 self-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
              >
                {t('continue')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!inline && ex.kind === 'choice' && status === 'idle' && (
        <p className="hidden text-center text-[11px] text-slate-400 sm:block">{t('keys_hint', { n: current.options.length })}</p>
      )}
    </div>
  )
}

/** The prompt with its gaps: empty while answering, filled with the answer afterwards */
function Prompt({ prompt, answer, status, small }: { prompt: string; answer: string | null; status: Status; small?: boolean }) {
  const parts = prompt.split(BLANK)
  const fills = answer ? (parts.length > 2 ? answer.split(' … ') : [answer]) : []
  return (
    <p className={cn('mt-4 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-2 font-bold leading-snug text-slate-900 dark:text-white', small ? 'text-xl' : 'text-xl md:text-2xl')}>
      {parts.map((part, i) => (
        <span key={i} className="contents">
          {part && <PromptText text={part} />}
          {i < parts.length - 1 && (
            answer ? (
              <motion.span
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={status === 'wrong' ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}
              >
                {fills[Math.min(i, fills.length - 1)]}
              </motion.span>
            ) : (
              <span className="inline-block min-w-16 border-b-[3px] border-dashed border-primary/40">&nbsp;</span>
            )
          )}
        </span>
      ))}
    </p>
  )
}

/** Hints in parentheses are shown smaller and lighter */
function PromptText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\([^)]*\))/).filter(Boolean).map((seg, i) =>
        seg.startsWith('(')
          ? <span key={i} className="text-sm font-semibold text-slate-400 dark:text-slate-500">{seg}</span>
          : <span key={i}><Highlighted text={seg} /></span>,
      )}
    </>
  )
}

/** A missed item as a full sentence, for the review list */
function resolvedText(q: Question): string {
  const prompt = q.item.prompt ?? ''
  if (prompt.includes(BLANK)) return fillPrompt(prompt, q.item.answer).replace(/\([^)]*\)/g, '').trim()
  if (prompt && !q.ex.listen) return `${prompt} → ${q.item.answer}`
  return q.item.say ?? q.item.answer
}

/** What the round paid and why */
function RewardBreakdown({ r, pct, mixed }: { r: GrammarRewardResult; pct: number; mixed: boolean }) {
  const t = useTranslations('grammar')
  const streakOn = r.multipliers.streak >= REWARDS.streakDays
  const rows: { label: string; amount: number; value?: string; tone: 'xp' | 'gem' | 'mult' }[] = [
    r.kind === 'first'
      ? { label: t('bd_score', { pct }), amount: r.baseXp, tone: 'xp' }
      : { label: mixed ? t('bd_mixed') : t('bd_practice'), amount: r.baseXp, tone: 'xp' },
    ...(streakOn ? [{ label: t('bd_streak', { n: r.multipliers.streak }), amount: 0, value: `×${REWARDS.streakMultiplier.toLocaleString()} XP`, tone: 'mult' as const }] : []),
    ...(r.multipliers.boost ? [{ label: t('bd_boost'), amount: 0, value: '×2 XP', tone: 'mult' as const }] : []),
    ...(r.gems > 0 ? [{ label: t('bd_mastered'), amount: r.gems, tone: 'gem' as const }] : []),
    ...(r.moduleMastered ? [{ label: t('bd_module'), amount: r.moduleGems, tone: 'gem' as const }] : []),
  ]
  const hint =
    r.kind === 'practice' && !mixed ? t('hint_practice', { xp: REWARDS.practiceXp }) :
    r.kind === 'first' && pct < MASTERY ? t('hint_first', { pct: MASTERY, gems: REWARDS.masteryGems }) :
    null
  return (
    <section className="flex flex-col gap-2">
      {r.moduleMastered && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-500/25"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Trophy size={22} /></span>
          <span className="min-w-0">
            <span className="block font-bold">{t('module_mastered_title')}</span>
            <span className="block text-sm text-white/85">{t('module_mastered_text', { gems: r.moduleGems })}</span>
          </span>
        </motion.div>
      )}
      <ul className="divide-y divide-black/[0.04] rounded-2xl bg-white px-4 dark:divide-white/[0.05] dark:bg-[#202638]">
        {rows.map(row => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
            {row.tone === 'xp' && <RewardChips xp={row.amount} size="md" />}
            {row.tone === 'gem' && <GemChip gems={row.amount} size="md" />}
            {row.tone === 'mult' && <span className="rounded-lg bg-indigo-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-300">{row.value}</span>}
          </li>
        ))}
      </ul>
      {r.gems + r.moduleGems < r.expectedGems && <p className="px-1 text-xs text-amber-600 dark:text-amber-400">{t('bd_cap')}</p>}
      {hint && <p className="px-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </section>
  )
}
