'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Ear, Eye, Flame, Gem, Keyboard, Lightbulb, RotateCcw, Sparkles, Volume2, X, Zap } from 'lucide-react'
import Link from 'next/link'
import { AppTopbar } from '@/components/layout/app-topbar'
import { SourcePicker } from '@/components/mini-games/source-picker'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { speak, stripArticle } from '@/lib/languages'
import { usePracticeContent, type PracticeWord } from '@/lib/practice-source'
import { addRewards } from '@/lib/rewards'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// Vocabulary trainer: every word goes through four stages in one session —
// meet it, recognise it, hear it, write it. A miss sends that step to the end
// of the queue. Practice only: it doesn't mark words as mastered in lessons.

type Stage = 'learn' | 'recognize' | 'listen' | 'write'
type Task = { id: number; stage: Stage; word: PracticeWord; options: string[]; retry: boolean }
type Status = 'idle' | 'correct' | 'almost' | 'wrong'
type Phase = 'setup' | 'playing' | 'finished'

const SIZES = [6, 10, 15] as const
const BATCH = 4
const GEMS = 3
const xpFor = (pct: number) => (pct >= 80 ? 15 : pct >= 60 ? 10 : 5)

const ACCENTS: Record<string, string[]> = {
  fr: ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'ë', 'œ'],
}

const STAGE_META: Record<Stage, { icon: typeof Eye; color: string }> = {
  learn: { icon: Lightbulb, color: 'text-amber-500 bg-amber-500/10' },
  recognize: { icon: Eye, color: 'text-sky-600 bg-sky-500/10' },
  listen: { icon: Ear, color: 'text-violet-600 bg-violet-500/10' },
  write: { icon: Keyboard, color: 'text-emerald-600 bg-emerald-500/10' },
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const fold = (s: string) => s.toLowerCase().replace(/[’`]/g, "'").replace(/[.!?¿¡,]/g, '').replace(/\s+/g, ' ').trim()
const bare = (s: string) => fold(s).normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Typed answer: the article is optional; only accents wrong → "almost" */
function checkWord(input: string, word: string, lang: string): Exclude<Status, 'idle'> {
  const given = fold(input)
  if (!given) return 'wrong'
  const targets = [fold(word), fold(stripArticle(word, lang))]
  if (targets.includes(given)) return 'correct'
  if (targets.map(bare).includes(bare(given))) return 'almost'
  return 'wrong'
}

function options(correct: string, pool: string[]): string[] {
  const others = shuffle([...new Set(pool.filter(o => o !== correct))]).slice(0, 3)
  return shuffle([correct, ...others])
}

/** Stages in batches of four words: meet + recognise each, then hear all, then write all */
function buildTasks(words: PracticeWord[], pool: PracticeWord[]): Task[] {
  const translations = pool.map(w => w.translation)
  const targets = pool.map(w => w.word)
  let id = 0
  const make = (stage: Stage, word: PracticeWord): Task => ({
    id: id++,
    stage,
    word,
    retry: false,
    options: stage === 'recognize' ? options(word.translation, translations) : stage === 'listen' ? options(word.word, targets) : [],
  })
  const tasks: Task[] = []
  for (let i = 0; i < words.length; i += BATCH) {
    const batch = words.slice(i, i + BATCH)
    for (const w of batch) tasks.push(make('learn', w), make('recognize', w))
    for (const w of shuffle(batch)) tasks.push(make('listen', w))
    for (const w of shuffle(batch)) tasks.push(make('write', w))
  }
  return tasks
}

export function VocabTrainer() {
  const t = useTranslations('vocab_trainer')
  const { languageCode, translationLang } = useActiveLanguage()
  const practice = usePracticeContent(languageCode, translationLang)

  const [size, setSize] = useState<(typeof SIZES)[number]>(10)
  const [phase, setPhase] = useState<Phase>('setup')
  const [queue, setQueue] = useState<Task[]>([])
  const [pos, setPos] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [results, setResults] = useState<Record<number, boolean>>({})   // first try per scored task
  const [missedWords, setMissedWords] = useState<Set<string>>(new Set())
  const [words, setWords] = useState<PracticeWord[]>([])
  const [streak, setStreak] = useState(0)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Unique words (the same word can appear in two lessons)
  const pool = useMemo(() => {
    const seen = new Set<string>()
    return practice.words.filter(w => (seen.has(w.word) ? false : (seen.add(w.word), true)))
  }, [practice.words])

  const current = queue[pos]
  const scoredTotal = queue.filter(q => q.stage !== 'learn' && !q.retry).length

  useEffect(() => () => { if (advance.current) clearTimeout(advance.current) }, [])

  // Say the word when it's introduced or when it has to be heard
  useEffect(() => {
    if (phase !== 'playing' || !current) return
    if (current.stage === 'learn' || current.stage === 'listen') speak(current.word.word, languageCode)
    if (current.stage === 'write') setTimeout(() => inputRef.current?.focus(), 50)
  }, [phase, current, languageCode])

  function start() {
    const chosen = shuffle(pool).slice(0, Math.min(size, pool.length))
    setWords(chosen)
    setQueue(buildTasks(chosen, pool))
    setPos(0)
    setStatus('idle')
    setPicked(null)
    setTyped('')
    setResults({})
    setMissedWords(new Set())
    setStreak(0)
    setRewards(null)
    setPhase('playing')
  }

  const finish = useCallback(async (res: Record<number, boolean>) => {
    setPhase('finished')
    const values = Object.values(res)
    const pct = values.length ? Math.round((values.filter(Boolean).length / values.length) * 100) : 0
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setRewards(await addRewards(supabase, user.id, { xp: xpFor(pct), gems: GEMS, reason: 'minigame', ref: 'vocabulary' }))
  }, [])

  const next = useCallback(() => {
    if (advance.current) clearTimeout(advance.current)
    advance.current = null
    if (pos + 1 >= queue.length) { finish(results); return }
    setPos(pos + 1)
    setStatus('idle')
    setPicked(null)
    setTyped('')
  }, [pos, queue.length, finish, results])

  const nextRef = useRef(next)
  useEffect(() => { nextRef.current = next }, [next])

  function answer(result: Exclude<Status, 'idle'>, option: string | null) {
    if (!current || status !== 'idle') return
    const ok = result !== 'wrong'
    setStatus(result)
    setPicked(option)
    if (!current.retry) setResults(r => ({ ...r, [current.id]: ok }))
    if (ok) {
      setStreak(s => s + 1)
      if (current.stage !== 'listen') speak(current.word.word, languageCode)
      if (result === 'correct') advance.current = setTimeout(() => nextRef.current(), 1000)
    } else {
      setStreak(0)
      setMissedWords(s => new Set(s).add(current.word.word))
      // The same step comes back at the end, with the options reshuffled
      setQueue(q => [...q, { ...current, id: current.id + 10_000 * (q.length + 1), retry: true, options: shuffle(current.options) }])
    }
  }

  // Keyboard: 1–4 to pick, Enter to continue
  useEffect(() => {
    if (phase !== 'playing' || !current) return
    function onKey(e: KeyboardEvent) {
      if (current.stage === 'learn' && e.key === 'Enter') { e.preventDefault(); next(); return }
      if ((current.stage === 'recognize' || current.stage === 'listen') && status === 'idle' && /^[1-4]$/.test(e.key)) {
        const opt = current.options[Number(e.key) - 1]
        const right = current.stage === 'recognize' ? current.word.translation : current.word.word
        if (opt) answer(opt === right ? 'correct' : 'wrong', opt)
      } else if (e.key === 'Enter' && status !== 'idle' && current.stage !== 'write') {
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const back = { href: '/mini-games', label: t('back') }

  // ── Setup ───────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const enough = pool.length >= BATCH
    return (
      <Shell title={t('title')} back={back}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <section className="relative overflow-hidden rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <Sparkles aria-hidden size={140} strokeWidth={1.5} className="pointer-events-none absolute -right-6 -bottom-8 text-primary opacity-[0.07]" />
            <div className="relative">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
              <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['learn', 'recognize', 'listen', 'write'] as const).map((s, i) => {
                  const Icon = STAGE_META[s].icon
                  return (
                    <li key={s} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] px-2.5 py-2">
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', STAGE_META[s].color)}><Icon size={14} /></span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold text-slate-400">{i + 1}</span>
                        <span className="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{t(`stage_${s}`)}</span>
                      </span>
                    </li>
                  )
                })}
              </ol>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><Zap size={11} /> {t('xp_up_to', { n: xpFor(100) })}</span>
                <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-600 dark:text-sky-400"><Gem size={11} /> +{GEMS}</span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-4 md:p-5">
            <SourcePicker className="w-full" />
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('words_label')}</p>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={size === n}
                    onClick={() => setSize(n)}
                    className={cn(
                      'rounded-2xl border-2 py-2.5 text-center transition-colors',
                      size === n ? 'border-primary bg-primary/[0.06]' : 'border-black/[0.06] dark:border-white/[0.08] hover:border-primary/40',
                    )}
                  >
                    <span className="block text-lg font-bold tabular-nums text-slate-900 dark:text-white">{n}</span>
                    <span className="block text-[11px] text-slate-500">{t(`size_${n}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {!practice.loading && !enough && (
            <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{t('not_enough')}</p>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={start}
            disabled={practice.loading || !enough}
            className="h-14 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-40"
          >
            {practice.loading ? t('loading') : t('start', { n: Math.min(size, pool.length) })}
          </motion.button>
        </div>
      </Shell>
    )
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const values = Object.values(results)
    const correct = values.filter(Boolean).length
    const pct = values.length ? Math.round((correct / values.length) * 100) : 0
    return (
      <Shell title={t('title')} back={back}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <section className="flex flex-col items-center gap-3 rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <span className="text-5xl">{pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪'}</span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{pct >= 80 ? t('result_great') : pct >= 50 ? t('result_good') : t('result_keep')}</h2>
            <p className="text-sm text-slate-500">{t('score', { pct })}</p>
            <div className="flex gap-2 text-sm font-bold">
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary"><Zap size={13} /> {rewards ? `+${rewards.xp} XP` : '…'}</span>
              <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 text-sky-600 dark:text-sky-400"><Gem size={13} /> {rewards ? `+${rewards.gems}` : '…'}</span>
            </div>
          </section>

          <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-4">
            <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('words_practiced')}</p>
            <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {words.map(w => {
                const missed = missedWords.has(w.word)
                return (
                  <li key={w.word}>
                    <button type="button" onClick={() => speak(w.word, languageCode)} className="group flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', missed ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600')}>
                        {missed ? <RotateCcw size={13} /> : <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{w.icon ? `${w.icon} ` : ''}{w.word}</span>
                        <span className="block truncate text-xs text-slate-500">{w.translation}</span>
                      </span>
                      <Volume2 size={14} className="shrink-0 text-slate-300 group-hover:text-primary" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="flex flex-col gap-2">
            <button type="button" onClick={start} className="h-12 rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/25">{t('play_again')}</button>
            <button type="button" onClick={() => setPhase('setup')} className="h-10 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">{t('change_settings')}</button>
          </div>
        </motion.div>
      </Shell>
    )
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  if (!current) return null
  const meta = STAGE_META[current.stage]
  const StageIcon = meta.icon
  const answered = Object.keys(results).length
  const progress = scoredTotal ? Math.min(1, answered / scoredTotal) : 0
  const rightAnswer = current.stage === 'recognize' ? current.word.translation : current.word.word
  const accents = ACCENTS[languageCode] ?? []

  return (
    <Shell title={t('title')} back={back}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href="/mini-games" aria-label={t('quit')} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/[0.06]">
            <X size={18} />
          </Link>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
          </div>
          <span className={cn('flex items-center gap-1 text-xs font-bold tabular-nums', streak >= 3 ? 'text-orange-500' : 'text-transparent')}>
            <Flame size={13} /> {streak}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={`${pos}-${current.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-center gap-2">
              <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-widest', meta.color)}>
                <StageIcon size={12} /> {t(`stage_${current.stage}`)}
              </span>
              {current.retry && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">{t('again')}</span>}
            </div>

            {/* Prompt */}
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] px-5 py-7 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              {current.stage === 'listen' ? (
                <>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => speak(current.word.word, languageCode)}
                    className="flex size-20 items-center justify-center rounded-full bg-violet-500 text-white shadow-xl shadow-violet-500/30"
                    aria-label={t('listen_again')}
                  >
                    <Volume2 size={32} />
                  </motion.button>
                  <p className="text-sm text-slate-500">{t('prompt_listen')}</p>
                </>
              ) : current.stage === 'write' ? (
                <>
                  {current.word.icon && <span className="text-4xl">{current.word.icon}</span>}
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{current.word.translation}</p>
                  <p className="text-sm text-slate-500">{t('prompt_write')}</p>
                </>
              ) : (
                <>
                  {current.word.icon && <span className="text-5xl">{current.word.icon}</span>}
                  <button type="button" onClick={() => speak(current.word.word, languageCode)} className="group inline-flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
                    {current.word.word}
                    <Volume2 size={18} className="text-slate-300 group-hover:text-primary" />
                  </button>
                  {current.stage === 'learn' ? (
                    <p className="text-lg text-slate-500 dark:text-slate-400">{current.word.translation}</p>
                  ) : (
                    <p className="text-sm text-slate-500">{t('prompt_recognize')}</p>
                  )}
                </>
              )}
            </div>

            {/* Answer area */}
            {current.stage === 'learn' ? (
              <button type="button" onClick={next} className="h-14 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25">
                {t('got_it')}
              </button>
            ) : current.stage === 'write' ? (
              <form onSubmit={e => { e.preventDefault(); if (status !== 'idle') next(); else if (typed.trim()) answer(checkWord(typed, current.word.word, languageCode), null) }} className="flex flex-col gap-2">
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  readOnly={status !== 'idle'}
                  autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
                  placeholder={t('type_placeholder')}
                  className={cn(
                    'h-14 w-full rounded-2xl border-2 bg-white dark:bg-[#202638] px-4 text-lg font-semibold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 focus:outline-none',
                    status === 'idle' && 'border-black/[0.08] dark:border-white/[0.1] focus:border-primary',
                    status === 'correct' && 'border-emerald-500',
                    status === 'almost' && 'border-amber-400',
                    status === 'wrong' && 'border-red-400 line-through decoration-red-400/60',
                  )}
                />
                {accents.length > 0 && status === 'idle' && (
                  <div className="flex flex-wrap gap-1">
                    {accents.map(ch => (
                      <button
                        key={ch}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          const el = inputRef.current
                          const a = el?.selectionStart ?? typed.length
                          const b = el?.selectionEnd ?? typed.length
                          setTyped(typed.slice(0, a) + ch + typed.slice(b))
                          requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + 1, a + 1) })
                        }}
                        className="size-9 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/50 hover:text-primary"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                )}
                {status === 'idle' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => answer('wrong', null)} className="h-12 rounded-2xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">{t('dont_know')}</button>
                    <button type="submit" disabled={!typed.trim()} className="h-12 flex-1 rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-40">{t('check')}</button>
                  </div>
                )}
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {current.options.map((opt, i) => {
                  const isRight = opt === rightAnswer
                  const shown = status !== 'idle'
                  return (
                    <motion.button
                      key={opt}
                      type="button"
                      disabled={shown}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => answer(isRight ? 'correct' : 'wrong', opt)}
                      animate={shown && picked === opt && !isRight ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.35 }}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border-2 bg-white dark:bg-[#202638] px-4 py-3.5 text-left text-base font-semibold transition-colors',
                        !shown && 'border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-slate-100 hover:border-primary/50',
                        shown && isRight && 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                        shown && !isRight && picked === opt && 'border-red-400 bg-red-500/10 text-red-600',
                        shown && !isRight && picked !== opt && 'border-black/[0.04] text-slate-300 dark:text-slate-600',
                      )}
                    >
                      <span className="hidden size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-400 dark:bg-white/[0.06] sm:flex">{i + 1}</span>
                      <span className="min-w-0 flex-1">{opt}</span>
                      {shown && isRight && <Check size={18} className="shrink-0" />}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3',
                status === 'correct' && 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                status === 'almost' && 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
                status === 'wrong' && 'bg-red-500/10 text-red-800 dark:text-red-300',
              )}
            >
              <button type="button" aria-label={t('listen_again')} onClick={() => speak(current.word.word, languageCode)} className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-white/[0.08]">
                <Volume2 size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{status === 'correct' ? t('correct') : status === 'almost' ? t('almost') : t('wrong')}</p>
                <p className="truncate text-sm">{current.word.word} · {current.word.translation}</p>
              </div>
              {status !== 'correct' && (
                <button type="button" onClick={next} className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-900">{t('continue')}</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  )
}

function Shell({ title, back, children }: { title: string; back: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={title} back={back} />
      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
    </div>
  )
}
