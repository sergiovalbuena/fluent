'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, Check, Clock, Flame, Headphones, Keyboard, ListChecks, ListOrdered, MousePointerClick, Play, RotateCcw, Shuffle, Target, Trophy, Volume2, Zap } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { GrammarBlockView } from '@/components/grammar/grammar-blocks'
import { GrammarProvider, Rich } from '@/components/grammar/rich-text'
import { StatusChip } from '@/components/grammar/status-chip'
import { ExerciseSession } from '@/components/grammar/exercise-session'
import { useGrammarIndex, useXpMultipliers } from '@/components/grammar/use-grammar'
import { ScoreRing } from '@/components/practice/score'
import { GemChip, RewardChips } from '@/components/practice/reward-chips'
import { MASTERY, MIXED_SIZE, REWARDS, applyXpMultipliers, gemsLeft, isModuleMastered, loadGrammarModule, moduleStatus, type GrammarExercise, type GrammarModule, type GrammarSection, type XpMultipliers } from '@/lib/grammar'
import { cn } from '@/lib/utils'

// A module is a path of steps: each section's explanation followed by its own
// practice, solved in place. The last step is the final review.

type Step = { id: string; n: number; section: GrammarSection | null; exercises: GrammarExercise[] }
type StepState = 'todo' | 'started' | 'mastered'

const FINAL = 'repaso'

export default function GrammarModulePage() {
  const t = useTranslations('grammar')
  const { slug } = useParams<{ slug: string }>()
  const { index, progress, ready, update, applyScore, languageCode, expl } = useGrammarIndex()
  // undefined: loading · null: not found
  const [mod, setMod] = useState<GrammarModule | null | undefined>(undefined)
  const [active, setActive] = useState<string | null>(null)
  const [inView, setInView] = useState<string | null>(null)
  const multipliers = useXpMultipliers()

  useEffect(() => {
    let cancelled = false
    if (!expl) return
    loadGrammarModule(languageCode, slug, expl).then(m => { if (!cancelled) setMod(m) })
    return () => { cancelled = true }
  }, [languageCode, slug, expl])

  // Opening a module counts as starting it
  useEffect(() => {
    if (mod && ready) update(mod.slug, p => (p.visited ? p : { ...p, visited: true }))
  }, [mod, ready, update])

  const steps = useMemo<Step[]>(() => {
    if (!mod) return []
    const list: Step[] = mod.sections.map((section, i) => ({
      id: section.id,
      n: i + 1,
      section,
      exercises: mod.exercises.filter(e => e.section === section.id),
    }))
    list.push({ id: FINAL, n: list.length + 1, section: null, exercises: mod.exercises.filter(e => e.section === 'final') })
    return list
  }, [mod])

  // The step list follows the scroll
  useEffect(() => {
    if (!steps.length) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setInView(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    for (const s of steps) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [steps])

  const best = useMemo(() => progress[slug]?.best ?? {}, [progress, slug])
  const stepState = useCallback((s: Step): StepState => {
    if (s.exercises.length === 0) return 'todo'
    if (s.exercises.every(e => (best[e.id] ?? -1) >= MASTERY)) return 'mastered'
    return s.exercises.some(e => best[e.id] !== undefined) ? 'started' : 'todo'
  }, [best])

  const onScore = useCallback((exId: string, pct: number) => applyScore(slug, exId, pct), [applyScore, slug])

  const back = { href: '/grammar', label: t('back') }

  if (mod === undefined || index === undefined) {
    return (
      <Shell back={back}>
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="h-64 animate-pulse rounded-3xl bg-white/70 dark:bg-white/[0.04]" />
          <div className="h-96 animate-pulse rounded-3xl bg-white/70 dark:bg-white/[0.04]" />
        </div>
      </Shell>
    )
  }
  if (mod === null || index === null) {
    return (
      <Shell back={back}>
        <p className="mx-auto max-w-3xl rounded-3xl border border-dashed border-black/[0.08] p-10 text-center text-sm text-slate-500 dark:border-white/[0.1]">
          {index === null ? t('unavailable') : t('not_found')}
        </p>
      </Shell>
    )
  }

  const entry = index.modules.find(m => m.slug === mod.slug)
  const p = progress[mod.slug]
  const status = entry ? moduleStatus(entry, p) : 'new'
  const part = index.parts.find(x => x.number === mod.part)
  const pos = index.modules.findIndex(m => m.slug === mod.slug)
  const prev = index.modules[pos - 1]
  const nextModule = index.modules[pos + 1]
  const questions = mod.exercises.reduce((n, e) => n + e.items.length, 0)
  const checked = new Set(p?.checklist ?? [])
  const practiced = steps.filter(s => s.exercises.length > 0)
  const masteredSteps = practiced.filter(s => stepState(s) === 'mastered').length
  const resumeStep = masteredSteps > 0 ? practiced.find(s => stepState(s) !== 'mastered') : undefined
  const exerciseIds = mod.exercises.map(e => e.id)
  const moduleDone = isModuleMastered(exerciseIds, best)
  const gemsToEarn = gemsLeft(exerciseIds, best)
  const xpNow = (xp: number) => (multipliers ? applyXpMultipliers(xp, multipliers) : xp)

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** After an exercise: the next one in the same step, or the next step */
  function nextAfter(step: Step, exId: string): { label: string; run: () => void } | undefined {
    const i = step.exercises.findIndex(e => e.id === exId)
    const sameStep = step.exercises[i + 1]
    if (sameStep) return { label: t('next_exercise'), run: () => setActive(sameStep.id) }
    const nextStep = steps[steps.findIndex(s => s.id === step.id) + 1]
    if (nextStep) return { label: t('next_step'), run: () => { setActive(null); goTo(nextStep.id) } }
    return undefined
  }

  function toggleCheck(i: number) {
    update(mod!.slug, cur => ({
      ...cur,
      checklist: cur.checklist.includes(i) ? cur.checklist.filter(x => x !== i) : [...cur.checklist, i],
    }))
  }

  return (
    <GrammarProvider value={{ languageCode, modules: index.modules }}>
      <Shell back={back}>
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 xl:max-w-[1080px] xl:grid-cols-[230px_minmax(0,1fr)]">

          {/* Steps (desktop) */}
          <nav aria-label={t('in_this_module')} className="hidden xl:block">
            <div className="sticky top-20 flex flex-col gap-0.5">
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('in_this_module')}</p>
              {steps.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl px-3 py-1.5 text-[13px] leading-snug transition-colors',
                    inView === s.id ? 'bg-white font-semibold text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:bg-[#202638] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white',
                  )}
                >
                  <StepDot n={s.n} state={stepState(s)} small />
                  <span className="min-w-0 pt-0.5">{s.section?.title ?? t('final_review')}</span>
                </a>
              ))}
            </div>
          </nav>

          <div className="flex w-full min-w-0 flex-col gap-5">

            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/[0.05] dark:bg-[#202638] md:p-8">
              <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none text-[9rem] font-black leading-none tracking-tighter text-indigo-500 opacity-[0.06]">
                {String(mod.number).padStart(2, '0')}
              </span>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                    {t('module_n', { n: mod.number })}{part ? ` · ${part.title}` : ''}
                  </span>
                  <StatusChip status={status} />
                </div>
                <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 dark:text-white md:text-[2rem]">{mod.title}</h1>
                <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">{mod.tagline}</p>

                <div className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.04]">
                  <Target size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('goal')}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{mod.goal}</p>
                  </div>
                </div>

                <RewardsPanel gemsToEarn={gemsToEarn} moduleDone={moduleDone} multipliers={multipliers} xpNow={xpNow} />

                {/* One segment per step with practice */}
                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('steps_progress', { done: masteredSteps, total: practiced.length })}</span>
                    <span className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12} /> {t('minutes', { n: mod.minutes })}</span>
                      <span className="hidden items-center gap-1 sm:flex"><ListChecks size={12} /> {t('questions_count', { n: questions })}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {practiced.map(s => {
                      const state = stepState(s)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => goTo(s.id)}
                          title={s.section?.title ?? t('final_review')}
                          aria-label={s.section?.title ?? t('final_review')}
                          className={cn(
                            'h-2 flex-1 rounded-full transition-colors',
                            state === 'mastered' ? 'bg-emerald-500' : state === 'started' ? 'bg-primary/50' : 'bg-black/[0.07] hover:bg-black/[0.12] dark:bg-white/[0.08]',
                          )}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <button
                    type="button"
                    onClick={() => goTo(resumeStep?.id ?? steps[0].id)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98]"
                  >
                    {resumeStep ? t('continue_step', { n: resumeStep.n }) : t('start_module')} <ArrowDown size={15} />
                  </button>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400"><Volume2 size={13} className="text-indigo-400" /> {t('tap_to_listen')}</span>
                </div>
              </div>
            </section>

            {/* The path */}
            <ol className="relative flex flex-col gap-8">
              <span aria-hidden className="absolute bottom-6 left-[19px] top-6 hidden w-0.5 rounded-full bg-gradient-to-b from-indigo-500/25 via-indigo-500/15 to-primary/25 md:block" />

              {steps.map(step => {
                const state = stepState(step)
                const isFinal = step.section === null
                return (
                  <li key={step.id} id={step.id} className="relative scroll-mt-20 md:pl-16">
                    <span className="absolute left-0 top-5 hidden md:block"><StepDot n={step.n} state={state} /></span>

                    {/* Explanation */}
                    {step.section ? (
                      <section className="rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-[#202638] md:p-7">
                        <h2 className="mb-4 flex items-center gap-3 text-lg font-bold leading-snug text-slate-900 dark:text-white md:text-xl">
                          <span className="md:hidden"><StepDot n={step.n} state={state} small /></span>
                          {step.section.title}
                        </h2>
                        <div className="flex flex-col gap-4">
                          {step.section.blocks.map((b, j) => <GrammarBlockView key={j} block={b} />)}
                        </div>
                      </section>
                    ) : (
                      <div className="flex items-center gap-3 px-1 pt-1.5">
                        <span className="md:hidden"><StepDot n={step.n} state={state} small /></span>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white md:text-xl">{t('final_review')}</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('final_review_hint')}</p>
                        </div>
                        <span className={cn(
                          'hidden shrink-0 items-center gap-1.5 text-xs font-bold sm:flex',
                          moduleDone ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400',
                        )}>
                          {moduleDone ? <><Check size={12} strokeWidth={3} /> {t('module_bonus_claimed')}</> : <><Trophy size={12} /> {t('module_bonus')} <GemChip gems={REWARDS.moduleGems} /></>}
                        </span>
                      </div>
                    )}

                    {/* Its practice */}
                    <div className="mt-3 flex flex-col gap-2.5">
                      {isFinal && (
                        <PracticeCard
                          title={t('mixed')}
                          meta={t('mixed_hint', { n: Math.min(MIXED_SIZE, questions) })}
                          reward={{ xp: xpNow(REWARDS.practiceXp), gems: 0, practice: true }}
                          icon={Shuffle}
                          open={active === 'mixed'}
                          onOpen={() => setActive('mixed')}
                          featured
                        >
                          <ExerciseSession key="mixed" module={mod} exId="mixed" variant="inline" onClose={() => setActive(null)} />
                        </PracticeCard>
                      )}
                      {step.exercises.map(ex => {
                        const after = nextAfter(step, ex.id)
                        return (
                          <PracticeCard
                            key={ex.id}
                            title={ex.title}
                            meta={t('questions_count', { n: ex.items.length })}
                            reward={(best[ex.id] ?? 0) >= MASTERY
                              ? { xp: xpNow(REWARDS.practiceXp), gems: 0, practice: true }
                              : { xp: xpNow(REWARDS.xp(100)), gems: REWARDS.masteryGems, practice: false }}
                            icon={ex.listen ? Headphones : KIND_ICON[ex.kind]}
                            best={best[ex.id]}
                            open={active === ex.id}
                            onOpen={() => setActive(ex.id)}
                            label={isFinal ? undefined : t('practice_this')}
                          >
                            <ExerciseSession
                              key={ex.id}
                              module={mod}
                              exId={ex.id}
                              variant="inline"
                              onScore={onScore}
                              onClose={() => setActive(null)}
                              onNext={after?.run}
                              nextLabel={after?.label}
                            />
                          </PracticeCard>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ol>

            {/* Self-assessment */}
            <section className="rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-[#202638] md:ml-16 md:p-7">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('self_check')}</h2>
                <span className="text-xs font-bold tabular-nums text-slate-400">{checked.size}/{mod.checklist.length}</span>
              </div>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('self_check_hint')}</p>
              <ul className="flex flex-col gap-1">
                {mod.checklist.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked.has(i)}
                      onClick={() => toggleCheck(i)}
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                        checked.has(i) ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-white/20',
                      )}
                    >
                      {checked.has(i) && <Check size={12} strokeWidth={3.5} />}
                    </button>
                    <span className={cn('text-[15px] leading-relaxed', checked.has(i) ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200')}>
                      <Rich text={c} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Outside the app */}
            {mod.challenge && (
              <section className="rounded-3xl border-2 border-dashed border-black/[0.08] p-5 dark:border-white/[0.1] md:ml-16 md:p-7">
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">{t('challenge')}</p>
                <h3 className="mt-1 font-bold text-slate-900 dark:text-white">{mod.challenge.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300"><Rich text={mod.challenge.text} /></p>
                <p className="mt-2 text-xs text-slate-400">{t('challenge_hint')}</p>
              </section>
            )}

            {/* Previous / next module */}
            <nav className="grid grid-cols-2 gap-3 pb-6 md:ml-16">
              {prev ? (
                <Link href={`/grammar/${prev.slug}`} className="group flex flex-col gap-0.5 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 dark:bg-[#202638]">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400"><ArrowLeft size={12} /> {t('prev')}</span>
                  <span className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100">{prev.number}. {prev.title}</span>
                </Link>
              ) : <span />}
              {nextModule && (
                <Link href={`/grammar/${nextModule.slug}`} className="group flex flex-col items-end gap-0.5 rounded-2xl bg-white p-4 text-right shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 dark:bg-[#202638]">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('next')} <ArrowRight size={12} /></span>
                  <span className="max-w-full truncate text-sm font-bold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100">{nextModule.number}. {nextModule.title}</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </Shell>
    </GrammarProvider>
  )
}

function Shell({ back, children }: { back: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar back={back} />
      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
    </div>
  )
}

function StepDot({ n, state, small }: { n: number; state: StepState; small?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-black tabular-nums',
        small ? 'size-6 text-[11px]' : 'size-10 text-sm ring-4 ring-[#f6f4f2] dark:ring-[#171b28]',
        state === 'mastered' && 'bg-emerald-500 text-white',
        state === 'started' && 'bg-primary text-white',
        state === 'todo' && 'border-2 border-indigo-500/25 bg-white text-indigo-500 dark:bg-[#202638]',
      )}
    >
      {state === 'mastered' ? <Check size={small ? 12 : 16} strokeWidth={3} /> : n}
    </span>
  )
}

const KIND_ICON = { choice: MousePointerClick, type: Keyboard, order: ListOrdered } as const

/** A step's exercise: a compact bar that opens into the exercise itself */
function PracticeCard({ title, meta, reward, icon: Icon, best, open, onOpen, label, featured, children }: {
  title: string
  meta: string
  reward: { xp: number; gems: number; practice: boolean }
  icon: React.ElementType
  best?: number
  open: boolean
  onOpen: () => void
  label?: string
  featured?: boolean
  children: React.ReactNode
}) {
  const t = useTranslations('grammar')
  const mastered = (best ?? 0) >= MASTERY
  return (
    <div className={cn(
      'overflow-hidden rounded-3xl border transition-colors',
      open ? 'border-primary/30 bg-primary/[0.04] dark:bg-primary/[0.06]' : 'border-primary/15 bg-gradient-to-r from-primary/[0.07] to-transparent dark:from-primary/[0.09]',
    )}>
      <button type="button" onClick={onOpen} disabled={open} className="group flex w-full items-center gap-3 p-4 text-left disabled:cursor-default md:px-5">
        <span className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-2xl',
          mastered ? 'bg-emerald-500/15 text-emerald-600' : featured ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-white text-primary shadow-sm dark:bg-white/[0.06]',
        )}>
          {mastered ? <Check size={19} strokeWidth={3} /> : <Icon size={19} />}
        </span>
        <span className="min-w-0 flex-1">
          {label && <span className="block text-[10px] font-black uppercase tracking-widest text-primary">{label}</span>}
          <span className="block font-bold leading-tight text-slate-900 dark:text-white">{title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{meta}</span>
            <RewardChips xp={reward.xp} gems={reward.gems} />
          </span>
        </span>
        {best !== undefined && !open && <ScoreRing pct={best} size="sm" />}
        {!open && (
          <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-bold text-white shadow-md shadow-primary/25 transition group-hover:opacity-95">
            {best === undefined ? <><Play size={12} fill="currentColor" /> <span className="hidden sm:inline">{t('start')}</span></> : <><RotateCcw size={13} /> <span className="hidden sm:inline">{t('retry')}</span></>}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-3 pb-4 md:px-5 md:pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The module's rewards: what each thing pays (as chips), what's left and the multipliers active now */
function RewardsPanel({ gemsToEarn, moduleDone, multipliers, xpNow }: { gemsToEarn: number; moduleDone: boolean; multipliers: XpMultipliers | null; xpNow: (xp: number) => number }) {
  const t = useTranslations('grammar')
  const streakOn = (multipliers?.streak ?? 0) >= REWARDS.streakDays
  const tiles = [
    { icon: Target, label: t('rw_master'), xp: xpNow(REWARDS.xp(100)), gems: REWARDS.masteryGems },
    { icon: RotateCcw, label: t('rw_repeat'), xp: xpNow(REWARDS.practiceXp), gems: 0 },
    { icon: Trophy, label: t('rw_module'), xp: 0, gems: REWARDS.moduleGems },
  ]
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('rewards_title')}</p>
        {streakOn && (
          <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
            <Flame size={10} /> ×{REWARDS.streakMultiplier.toLocaleString()} XP
          </span>
        )}
        {multipliers?.boost && (
          <span className="flex items-center gap-1 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
            <Zap size={10} /> ×2 XP
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          {moduleDone
            ? <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"><Check size={12} strokeWidth={3} /> {t('rewards_all_claimed')}</span>
            : <>{t('rewards_left_label')} <GemChip gems={gemsToEarn} size="md" /></>}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tiles.map(({ icon: Icon, label, xp, gems }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm dark:bg-white/[0.06]"><Icon size={15} /></span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">{label}</span>
              <RewardChips xp={xp} gems={gems} className="mt-1" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
