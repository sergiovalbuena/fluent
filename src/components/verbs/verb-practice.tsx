'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flame, Gem, Keyboard, ListChecks, RotateCcw, Target, Volume2, X, Zap } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { speak } from '@/lib/languages'
import { createClient } from '@/lib/supabase/client'
import { addRewards } from '@/lib/rewards'
import { loadVerbForms, loadVerbIndex, speakableForm, verbTranslation, type VerbForms, type VerbIndex } from '@/lib/verbs'
import { buildRound, checkTyped, quizTenses, shuffle, type QuizMode, type QuizQuestion } from '@/lib/verb-quiz'
import { cn } from '@/lib/utils'

type Pool = 'essentials' | 'all' | 'verb'
type Phase = 'setup' | 'playing' | 'finished'
type Status = 'idle' | 'correct' | 'almost' | 'wrong'

const ROUND = 10
/** Same as the other mini-games: XP by accuracy, +3 gems per full round */
const GEMS = 3
const xpFor = (pct: number) => (pct >= 80 ? 15 : pct >= 60 ? 10 : 5)

const ACCENTS: Record<string, string[]> = {
  fr: ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'ë', 'œ'],
}

const SETTINGS_KEY = 'fluent:verb-game'
type Settings = { tenses: string[]; mode: QuizMode; pool: Exclude<Pool, 'verb'> }

function readSettings(lang: string): Partial<Settings> {
  try {
    return JSON.parse(localStorage.getItem(`${SETTINGS_KEY}:${lang}`) ?? '{}') as Partial<Settings>
  } catch {
    return {}
  }
}

function saveSettings(lang: string, s: Settings) {
  try {
    localStorage.setItem(`${SETTINGS_KEY}:${lang}`, JSON.stringify(s))
  } catch {
    // Private mode: settings just aren't remembered
  }
}

export function VerbPractice() {
  const t = useTranslations('verb_game')
  const tv = useTranslations('verbs')
  const { languageCode, translationLang } = useActiveLanguage()
  const verbParam = useSearchParams().get('verb')

  const [index, setIndex] = useState<VerbIndex | null | undefined>(undefined)
  const [forms, setForms] = useState<Record<string, VerbForms> | null>(null)

  // Setup
  const [pool, setPool] = useState<Pool>(verbParam ? 'verb' : 'essentials')
  const [tenses, setTenses] = useState<string[]>([])
  const [mode, setMode] = useState<QuizMode>('choose')

  // Round
  const [phase, setPhase] = useState<Phase>('setup')
  const [queue, setQueue] = useState<QuizQuestion[]>([])
  const [pos, setPos] = useState(0)
  const [roundSize, setRoundSize] = useState(ROUND)
  const [isReview, setIsReview] = useState(false)
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({})
  const [requeued, setRequeued] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<Status>('idle')
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadVerbIndex(languageCode), loadVerbForms(languageCode)]).then(([idx, f]) => {
      if (cancelled) return
      setIndex(idx)
      setForms(f)
      if (!idx) return
      const saved = readSettings(languageCode)
      const valid = new Set(quizTenses(idx).map(o => o.key))
      const savedTenses = (saved.tenses ?? []).filter(k => valid.has(k))
      setTenses(savedTenses.length ? savedTenses : [quizTenses(idx)[0].key])
      if (saved.mode) setMode(saved.mode)
      if (saved.pool && !verbParam) setPool(saved.pool)
    })
    return () => { cancelled = true }
  }, [languageCode, verbParam])

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])

  const tenseOptions = useMemo(() => (index ? quizTenses(index) : []), [index])
  const tenseLabel = useCallback((key: string) => tenseOptions.find(o => o.key === key)?.label ?? key, [tenseOptions])
  const focusVerb = index?.verbs.find(v => v.id === verbParam) ?? null

  const poolVerbs = useMemo(() => {
    if (!index) return []
    if (pool === 'verb' && focusVerb) return [focusVerb]
    return pool === 'essentials' ? index.verbs.filter(v => v.essential) : index.verbs
  }, [index, pool, focusVerb])

  // ── Round control ───────────────────────────────────────────────────────────
  function begin(questions: QuizQuestion[], review: boolean) {
    if (questions.length === 0) return
    setQueue(questions)
    setRoundSize(questions.length)
    setIsReview(review)
    setPos(0)
    setFirstTry({})
    setRequeued(new Set())
    setStatus('idle')
    setPicked(null)
    setTyped('')
    setStreak(0)
    setBestStreak(0)
    setRewards(null)
    setPhase('playing')
  }

  function start() {
    if (!index || !forms) return
    if (pool !== 'verb') saveSettings(languageCode, { tenses, mode, pool })
    begin(buildRound(poolVerbs, forms, tenses, index, ROUND), false)
  }

  const current = queue[pos]

  const finish = useCallback(async (results: Record<string, boolean>, review: boolean) => {
    setPhase('finished')
    if (review) return
    const correct = Object.values(results).filter(Boolean).length
    const pct = Math.round((correct / Math.max(Object.keys(results).length, 1)) * 100)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setRewards(await addRewards(supabase, user.id, { xp: xpFor(pct), gems: GEMS, reason: 'minigame', ref: 'verbs' }))
  }, [])

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
  }, [pos, queue.length, finish, firstTry, isReview])

  function answer(result: Exclude<Status, 'idle'>, option: string | null) {
    if (!current || status !== 'idle') return
    const ok = result !== 'wrong'
    setStatus(result)
    setPicked(option)
    // Only the first attempt counts for the score
    if (!(current.id in firstTry)) setFirstTry(r => ({ ...r, [current.id]: ok }))
    if (ok) {
      speak(speakableForm(current.full), languageCode)
      setStreak(s => {
        setBestStreak(b => Math.max(b, s + 1))
        return s + 1
      })
      if (result === 'correct') advanceTimer.current = setTimeout(() => advanceTimer.current && nextRef.current(), 1100)
    } else {
      setStreak(0)
      // A miss comes back once at the end of the round, with the options reshuffled
      if (!requeued.has(current.id)) {
        setRequeued(s => new Set(s).add(current.id))
        setQueue(q => [...q, { ...current, options: shuffle(current.options) }])
      }
    }
  }

  // The timer must call the latest `next`
  const nextRef = useRef(next)
  useEffect(() => { nextRef.current = next }, [next])

  function submitTyped() {
    if (!current) return
    if (status !== 'idle') { next(); return }
    if (!typed.trim()) return
    answer(checkTyped(typed, current), null)
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

  // Keyboard: 1–4 pick an option, Enter continues
  useEffect(() => {
    if (phase !== 'playing' || !current) return
    function onKey(e: KeyboardEvent) {
      if (mode === 'choose' && status === 'idle' && /^[1-4]$/.test(e.key)) {
        const opt = current.options[Number(e.key) - 1]
        if (opt) answer(opt === current.answer ? 'correct' : 'wrong', opt)
      } else if (e.key === 'Enter' && status !== 'idle' && mode === 'choose') {
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (phase === 'playing' && mode === 'type' && status === 'idle') inputRef.current?.focus()
  }, [phase, mode, status, pos])

  const back = { href: '/verbs', label: tv('title') }

  // ── Loading / unavailable ───────────────────────────────────────────────────
  if (index === undefined || (index && !forms)) {
    return (
      <Shell back={back} title={t('title')}>
        <p className="py-20 text-center text-sm text-slate-400">{tv('loading')}</p>
      </Shell>
    )
  }
  if (index === null) {
    return (
      <Shell back={back} title={t('title')}>
        <p className="rounded-3xl border border-dashed border-black/[0.08] dark:border-white/[0.1] p-10 text-center text-sm text-slate-500">{tv('unavailable')}</p>
      </Shell>
    )
  }

  // ── Setup ───────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const moods = [...new Set(tenseOptions.map(o => o.mood))]
    const pools: { key: Pool; label: string; count: number }[] = [
      ...(focusVerb ? [{ key: 'verb' as const, label: t('pool_verb', { verb: focusVerb.infinitive }), count: 1 }] : []),
      { key: 'essentials', label: tv('essentials'), count: index.verbs.filter(v => v.essential).length },
      { key: 'all', label: t('pool_all'), count: index.verbs.length },
    ]
    return (
      <Shell back={back} title={t('title')}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <section className="relative overflow-hidden rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <Target aria-hidden size={140} strokeWidth={1.5} className="pointer-events-none absolute -right-6 -bottom-8 text-primary opacity-[0.07]" />
            <div className="relative flex items-start gap-4">
              <div className="size-12 shrink-0 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">{t('title')}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle', { n: ROUND })}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><Zap size={11} /> {t('xp_up_to', { n: xpFor(100) })}</span>
                  <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-600 dark:text-sky-400"><Gem size={11} /> +{GEMS}</span>
                </div>
              </div>
            </div>
          </section>

          <SetupBlock title={t('verbs_label')}>
            <div className="flex flex-wrap gap-1.5">
              {pools.map(p => (
                <Chip key={p.key} active={pool === p.key} onClick={() => setPool(p.key)}>
                  {p.label} <span className="opacity-50">· {p.count}</span>
                </Chip>
              ))}
            </div>
          </SetupBlock>

          <SetupBlock title={t('tenses_label')} hint={tenses.length === 0 ? t('pick_tense') : t('tenses_selected', { n: tenses.length })}>
            <div className="flex flex-col gap-3">
              {moods.map(m => (
                <div key={m}>
                  {moods.length > 1 && <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{m}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {tenseOptions.filter(o => o.mood === m).map(o => (
                      <Chip
                        key={o.key}
                        active={tenses.includes(o.key)}
                        onClick={() => setTenses(cur => (cur.includes(o.key) ? cur.filter(k => k !== o.key) : [...cur, o.key]))}
                      >
                        {tenses.includes(o.key) && <Check size={12} />}
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SetupBlock>

          <SetupBlock title={t('mode_label')}>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'choose', icon: ListChecks, label: t('mode_choose'), hint: t('mode_choose_hint') },
                { key: 'type', icon: Keyboard, label: t('mode_type'), hint: t('mode_type_hint') },
              ] as const).map(({ key, icon: Icon, label, hint }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={mode === key}
                  onClick={() => setMode(key)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border-2 p-3 text-left transition-colors',
                    mode === key
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-black/[0.06] dark:border-white/[0.08] hover:border-primary/40',
                  )}
                >
                  <Icon size={18} className={cn('mt-0.5 shrink-0', mode === key ? 'text-primary' : 'text-slate-400')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </SetupBlock>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={start}
            disabled={tenses.length === 0 || poolVerbs.length === 0}
            className="h-14 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            {t('start')}
          </motion.button>
        </div>
      </Shell>
    )
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const results = Object.entries(firstTry)
    const correct = results.filter(([, ok]) => ok).length
    const pct = Math.round((correct / Math.max(results.length, 1)) * 100)
    const missed = queue.slice(0, roundSize).filter(q => firstTry[q.id] === false)
    const headline = pct >= 80 ? t('result_great') : pct >= 50 ? t('result_good') : t('result_keep')
    return (
      <Shell back={back} title={t('title')}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex w-full max-w-xl flex-col gap-4"
        >
          <section className="flex flex-col items-center gap-4 rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <ScoreRing pct={pct} />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{headline}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('score', { correct, total: results.length })}</p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              <Stat icon={<Flame size={14} className="text-orange-500" />} value={String(bestStreak)} label={t('best_streak')} />
              <Stat icon={<Zap size={14} className="text-primary" />} value={isReview ? '—' : rewards ? `+${rewards.xp}` : '…'} label="XP" />
              <Stat icon={<Gem size={14} className="text-sky-500" />} value={isReview ? '—' : rewards ? `+${rewards.gems}` : '…'} label={t('gems')} />
            </div>
            {isReview && <p className="text-xs text-slate-400">{t('review_no_rewards')}</p>}
          </section>

          <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('to_review')}</h3>
            {missed.length === 0 ? (
              <p className="px-1 py-2 text-sm text-slate-500">{t('no_mistakes')}</p>
            ) : (
              <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {missed.map(q => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => speak(speakableForm(q.full), languageCode)}
                      className="group flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{q.full}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{q.verb.infinitive} · {tenseLabel(q.tenseKey)}</span>
                      </span>
                      <Volume2 size={14} className="shrink-0 text-slate-300 group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-2">
            {missed.length > 0 && (
              <button
                type="button"
                onClick={() => begin(shuffle(missed).map(q => ({ ...q, options: shuffle(q.options) })), true)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/25"
              >
                <RotateCcw size={16} /> {t('retry_mistakes', { n: missed.length })}
              </button>
            )}
            <button
              type="button"
              onClick={start}
              className={cn(
                'h-12 rounded-2xl font-bold transition-colors',
                missed.length > 0
                  ? 'border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                  : 'bg-primary text-white shadow-lg shadow-primary/25',
              )}
            >
              {t('play_again')}
            </button>
            <button type="button" onClick={() => setPhase('setup')} className="h-10 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
              {t('change_settings')}
            </button>
          </div>
        </motion.div>
      </Shell>
    )
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  if (!current) return null
  const progress = (pos + (status === 'idle' ? 0 : 1)) / queue.length
  const isRetry = pos >= roundSize
  const accents = ACCENTS[languageCode] ?? []

  return (
    <Shell back={back} title={t('title')}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <Link href="/verbs" aria-label={t('quit')} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/[0.06]">
            <X size={18} />
          </Link>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
          </div>
          <span className="w-12 text-right text-xs font-bold tabular-nums text-slate-500">{Math.min(pos + 1, queue.length)}/{queue.length}</span>
        </div>

        <div className="flex h-6 items-center justify-center">
          <AnimatePresence>
            {streak >= 2 && (
              <motion.span
                key={streak}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400"
              >
                <Flame size={12} /> {t('streak', { n: streak })}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.section
            key={`${pos}-${current.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            <div className="rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] px-5 py-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-primary">{tenseLabel(current.tenseKey)}</span>
                {isRetry && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">{t('again')}</span>}
              </div>
              <button
                type="button"
                onClick={() => speak(current.verb.infinitive, languageCode)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary dark:text-slate-400"
              >
                <Volume2 size={13} />
                {current.verb.infinitive}
                <span className="font-normal text-slate-400">· {verbTranslation(current.verb, translationLang)}</span>
              </button>
              <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2 text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                {current.subject && <span className="text-slate-400 dark:text-slate-500">{current.subject}</span>}
                {status === 'idle' ? (
                  <span className="inline-block min-w-24 border-b-[3px] border-dashed border-primary/40">&nbsp;</span>
                ) : (
                  <motion.span
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={status === 'wrong' ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}
                  >
                    {current.answer}
                  </motion.span>
                )}
              </p>
            </div>

            {mode === 'choose' ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {current.options.map((opt, i) => {
                  const isAnswer = opt === current.answer
                  const shown = status !== 'idle'
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
                        'flex items-center gap-3 rounded-2xl border-2 bg-white dark:bg-[#202638] px-4 py-3.5 text-left text-base font-semibold transition-colors',
                        !shown && 'border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-slate-100 hover:border-primary/50 hover:bg-primary/[0.03]',
                        shown && isAnswer && 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                        shown && !isAnswer && picked === opt && 'border-red-400 bg-red-500/10 text-red-600 dark:text-red-300',
                        shown && !isAnswer && picked !== opt && 'border-black/[0.04] dark:border-white/[0.05] text-slate-300 dark:text-slate-600',
                      )}
                    >
                      <span className="hidden size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-400 dark:bg-white/[0.06] sm:flex">{i + 1}</span>
                      <span className="min-w-0 flex-1">{opt}</span>
                      {shown && isAnswer && <Check size={18} className="shrink-0" />}
                    </motion.button>
                  )
                })}
              </div>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); submitTyped() }}
                className="flex flex-col gap-2"
              >
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  readOnly={status !== 'idle'}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
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
                        onClick={() => insertAccent(ch)}
                        className="size-9 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/50 hover:text-primary"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                )}
                {status === 'idle' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => answer('wrong', null)} className="h-12 rounded-2xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
                      {t('dont_know')}
                    </button>
                    <button type="submit" disabled={!typed.trim()} className="h-12 flex-1 rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-40">
                      {t('check')}
                    </button>
                  </div>
                )}
              </form>
            )}
          </motion.section>
        </AnimatePresence>

        {/* Feedback */}
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
              <button
                type="button"
                aria-label={tv('listen')}
                onClick={() => speak(speakableForm(current.full), languageCode)}
                className="size-9 shrink-0 rounded-xl bg-white/70 dark:bg-white/[0.08] flex items-center justify-center"
              >
                <Volume2 size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {status === 'correct' ? t('correct') : status === 'almost' ? t('almost') : t('wrong')}
                </p>
                <p className="truncate text-sm">{current.full}</p>
              </div>
              {status !== 'correct' && (
                <button
                  type="button"
                  onClick={next}
                  className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
                >
                  {t('continue')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'choose' && status === 'idle' && (
          <p className="hidden text-center text-[11px] text-slate-400 sm:block">{t('keys_hint')}</p>
        )}
      </div>
    </Shell>
  )
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function Shell({ back, title, children }: { back: { href: string; label: string }; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={title} back={back} />
      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
    </div>
  )
}

function SetupBlock({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-4 md:p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</h2>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'bg-slate-100 text-slate-500 hover:text-slate-800 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] py-3">
      {icon}
      <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  )
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#ff8052' : '#f59e0b'
  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke={color}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{pct}%</span>
    </div>
  )
}
