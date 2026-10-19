'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight, Bookmark, BookType, Check, Flame, Gamepad2, Gem, GraduationCap, Keyboard, Lock, Map as MapIcon, Shield, ShoppingBag,
  Sparkles, Target, Trophy, Users, Volume2, Zap,
} from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { GemChip } from '@/components/practice/reward-chips'
import { getGreeting, speak } from '@/lib/languages'
import { speakableForm } from '@/lib/verbs'
import { WEEKLY_XP_PER_MEMBER } from '@/lib/study-group'
import { cn } from '@/lib/utils'
import type { LessonState } from '@/lib/course-path'

export type DashboardData = {
  languageCode: string
  firstName: string
  streak: number
  longestStreak: number
  freezes: number
  totalXp: number
  gems: number
  boosts: { xp: boolean; gems: boolean }
  dailyGoalMinutes: number
  /** XP per day this week, Monday first */
  weekXp: number[]
  weekActive: boolean[]
  todayIndex: number
  path: {
    total: number
    completed: number
    currentIndex: number
    /** Index of the first module in `modules` */
    start: number
    modules: { slug: string; title: string; icon: string; progress: number; state: LessonState }[]
  }
  grammar: {
    mastered: number
    total: number
    next: { slug: string; number: number; title: string; tagline: string; exercises: boolean[]; gems: number; started: boolean } | null
  } | null
  verb: {
    id: string
    infinitive: string
    translation: string
    aux: 'être' | 'avoir' | null
    tense: string
    forms: string[]
    example: { text: string; translation: string; match: string } | null
  } | null
  group: { name: string; members: { id: string; name: string; avatar: string | null; weekXp: number; isMe: boolean }[] } | null
  saved: { count: number; title: string | null; thumbnail: string | null; platform: string } | null
}

/** Daily goal in XP: the minutes chosen in the profile, at ~4 XP a minute */
const XP_PER_GOAL_MINUTE = 4

// ── Motion (shared with /mini-games, /community and the lesson bento) ─────────
const card: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  hover: { y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } },
}
const spring = { type: 'spring', stiffness: 380, damping: 20 } as const

const SURFACE = 'relative h-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] dark:border-white/[0.05] dark:bg-[#202638]'
const LABEL = 'text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400'

/** Narrow weekday names, Monday first, in the UI language (fixed dates: no clock) */
function useWeekdays(locale: string) {
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' })
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))))
  }, [locale])
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardContent({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard')
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />
      <main className="flex-1 px-3 py-4 md:px-5 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.045 }}
          className="mx-auto grid max-w-6xl grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >
          <TodayCard data={data} />
          <StreakCard data={data} />
          <WalletCard data={data} />
          {data.grammar && <GrammarCard grammar={data.grammar} />}
          {data.verb && <VerbCard verb={data.verb} languageCode={data.languageCode} wide={!data.grammar} />}
          <GamesCard wide={!data.grammar && !data.verb} />
          <WeekCard data={data} />
          <GroupCard group={data.group} />
          <PathCard path={data.path} />
          <SavedCard saved={data.saved} />
        </motion.div>
      </main>
    </div>
  )
}

/** A bento cell: enters with the page and lifts on hover; a link when href is given */
function Cell({ className, href, children }: { className: string; href?: string; children: React.ReactNode }) {
  const inner = (
    <motion.div variants={card} whileHover={href ? 'hover' : undefined} className="h-full">
      {children}
    </motion.div>
  )
  return href
    ? <Link href={href} className={cn('group rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-primary/40', className)}>{inner}</Link>
    : <div className={className}>{inner}</div>
}

// ── Today: greeting, daily goal and the lesson to continue ────────────────────

function TodayCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard')
  const [hour] = useState(() => new Date().getHours())
  const greeting = getGreeting(data.languageCode, hour)
    ?? (hour < 12 ? t('greeting_morning') : hour < 18 ? t('greeting_afternoon') : t('greeting_evening'))
  const goal = data.dailyGoalMinutes * XP_PER_GOAL_MINUTE
  const today = data.weekXp[data.todayIndex] ?? 0
  const pct = Math.min(today / goal, 1)
  const reached = today >= goal
  const current = data.path.modules[data.path.currentIndex - data.path.start]
  const allDone = data.path.total > 0 && data.path.completed >= data.path.total

  return (
    <Cell className="col-span-12 lg:col-span-8 lg:row-span-2">
      <section className={cn(SURFACE, 'flex flex-col justify-between gap-6 p-6 md:p-8')}>
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span suppressHydrationWarning className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              {greeting}
            </span>
            <h1 className="mt-3 truncate text-3xl font-bold leading-tight text-slate-900 dark:text-white md:text-[2.5rem]">
              {data.firstName ? `${data.firstName}!` : '👋'}
            </h1>
            <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
              {reached ? t('goal_done') : today > 0 ? t('goal_left', { xp: goal - today }) : t('goal_start', { xp: goal })}
            </p>
          </div>
          <GoalRing pct={pct} today={today} goal={goal} reached={reached} minutes={data.dailyGoalMinutes} />
        </div>

        {/* Continue */}
        {current && !allDone ? (
          <Link
            href={`/learn/${current.slug}`}
            className="group/c relative flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary to-[#f45d48] p-4 text-white shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30 md:p-5"
          >
            <motion.span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm"
              whileHover={{ rotate: -6, scale: 1.06 }}
              transition={spring}
            >
              {current.icon}
            </motion.span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-widest text-white/75">
                {t('continue_title')} · {t('lesson_n', { n: data.path.currentIndex + 1 })}
              </span>
              <span className="mt-0.5 block truncate text-lg font-bold">{current.title}</span>
              <span className="mt-2 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <motion.span
                    className="block h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(current.progress, 3)}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className="text-xs font-bold tabular-nums">{current.progress}%</span>
              </span>
            </span>
            <span className="hidden h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-primary shadow-md transition group-hover/c:gap-2.5 sm:flex">
              {current.progress === 0 ? t('start') : t('resume')} <ArrowRight size={15} />
            </span>
          </Link>
        ) : (
          <Link href="/learn" className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 p-5 font-bold text-emerald-700 dark:text-emerald-300">
            <span className="flex items-center gap-2"><Trophy size={18} /> {allDone ? t('all_done') : t('browse_lessons')}</span>
            <ArrowRight size={16} />
          </Link>
        )}
      </section>
    </Cell>
  )
}

function GoalRing({ pct, today, goal, reached, minutes }: { pct: number; today: number; goal: number; reached: boolean; minutes: number }) {
  const t = useTranslations('dashboard')
  const r = 54
  const c = 2 * Math.PI * r
  return (
    <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:gap-1">
      <div className="relative size-32">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="11" className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
          <motion.circle
            cx="64" cy="64" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
            stroke={reached ? '#10b981' : 'url(#today-gradient)'}
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="today-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8052" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          {reached
            ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 1 }}><Check size={30} strokeWidth={3} className="text-emerald-500" /></motion.span>
            : <span className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{today}</span>}
          <span className="text-[11px] font-bold text-slate-400">/ {goal} XP</span>
        </span>
      </div>
      <div className="sm:text-center">
        <p className={LABEL}>{t('today_goal')}</p>
        <p className="text-xs text-slate-400">{t('goal_minutes', { n: minutes })}</p>
      </div>
    </div>
  )
}

// ── Streak ────────────────────────────────────────────────────────────────────

function StreakCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const days = useWeekdays(locale)
  const todayDone = data.weekActive[data.todayIndex]
  return (
    <Cell className="col-span-12 sm:col-span-6 lg:col-span-4" href="/progress">
      <section
        className="relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl p-5 text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)]"
        style={{ background: 'linear-gradient(140deg, #fb923c 0%, #f97316 45%, #ea580c 100%)' }}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-4 text-white/15"
          animate={{ scale: [1, 1.06, 1], rotate: [-3, 3, -3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame size={120} fill="currentColor" />
        </motion.span>
        <div className="relative flex items-end gap-3">
          <motion.span
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
          >
            <Flame size={26} fill="currentColor" />
          </motion.span>
          <div>
            <p className="text-4xl font-black leading-none tabular-nums">{data.streak}</p>
            <p className="text-sm font-semibold text-white/85">{t('streak_days', { n: data.streak })}</p>
          </div>
          {data.freezes > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm" title={t('streak_freezes', { n: data.freezes })}>
              <Shield size={11} fill="currentColor" /> ×{data.freezes}
            </span>
          )}
        </div>
        <div className="relative mt-auto">
          <div className="flex justify-between gap-1">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring, delay: 0.3 + i * 0.04 }}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-[11px] font-black',
                    data.weekActive[i] ? 'bg-white text-orange-500' : i === data.todayIndex ? 'border-2 border-dashed border-white/70' : 'bg-white/15',
                  )}
                >
                  {data.weekActive[i] ? <Check size={13} strokeWidth={3.5} /> : null}
                </motion.span>
                <span className={cn('text-[10px] font-bold', i === data.todayIndex ? 'text-white' : 'text-white/60')}>{d}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-white/80">
            {data.streak === 0 ? t('streak_zero') : todayDone ? t('streak_today_done') : t('streak_today_pending')}
            {data.longestStreak > 0 && <span className="text-white/60"> · {t('streak_best', { n: data.longestStreak })}</span>}
          </p>
        </div>
      </section>
    </Cell>
  )
}

// ── Wallet: XP, gems, boosts ──────────────────────────────────────────────────

function WalletCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  return (
    <Cell className="col-span-12 sm:col-span-6 lg:col-span-4" href="/gems">
      <section className={cn(SURFACE, 'flex flex-col gap-4 p-5')}>
        <div className="flex items-center justify-between">
          <p className={LABEL}>{t('wallet_title')}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-sky-600 transition-colors group-hover:text-sky-500 dark:text-sky-400">
            <ShoppingBag size={13} /> {t('shop')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-primary/[0.07] p-3">
            <Zap size={16} className="text-primary" />
            <p className="mt-1.5 text-2xl font-black tabular-nums text-slate-900 dark:text-white">{data.totalXp.toLocaleString(locale)}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary/80">XP</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-sky-500/[0.08] p-3">
            <motion.span
              aria-hidden
              className="absolute -bottom-3 -right-2 text-sky-500/15"
              animate={{ rotate: [0, 8, 0], y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Gem size={56} />
            </motion.span>
            <Gem size={16} className="text-sky-500" />
            <p className="relative mt-1.5 text-2xl font-black tabular-nums text-slate-900 dark:text-white">{data.gems.toLocaleString(locale)}</p>
            <p className="relative text-[11px] font-bold uppercase tracking-wider text-sky-600/80 dark:text-sky-400/80">{t('gems')}</p>
          </div>
        </div>
        {(data.boosts.xp || data.boosts.gems) && (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {data.boosts.xp && <span className="flex items-center gap-1 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300"><Zap size={10} /> ×2 XP</span>}
            {data.boosts.gems && <span className="flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400"><Gem size={10} /> ×2</span>}
          </div>
        )}
      </section>
    </Cell>
  )
}

// ── Grammar ───────────────────────────────────────────────────────────────────

function GrammarCard({ grammar }: { grammar: NonNullable<DashboardData['grammar']> }) {
  const t = useTranslations('dashboard')
  const next = grammar.next
  return (
    <Cell className="col-span-12 md:col-span-6 lg:col-span-4" href={next ? `/grammar/${next.slug}` : '/grammar'}>
      <section className={cn(SURFACE, 'flex flex-col gap-4 p-5')}>
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-8 select-none text-[7rem] font-black leading-none tracking-tighter text-indigo-500 opacity-[0.07] transition-transform duration-500 group-hover:-translate-x-2">
          {next ? String(next.number).padStart(2, '0') : '✓'}
        </span>
        <div className="relative flex items-center justify-between gap-2">
          <p className={cn(LABEL, 'flex items-center gap-1.5')}><GraduationCap size={14} className="text-indigo-500" /> {t('grammar_title')}</p>
          <span className="text-[11px] font-bold tabular-nums text-slate-400">{grammar.mastered}/{grammar.total}</span>
        </div>
        {next ? (
          <>
            <div className="relative">
              <p className="text-[11px] font-bold text-indigo-500">{t('grammar_module', { n: next.number })}</p>
              <p className="text-lg font-bold leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">{next.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{next.tagline}</p>
            </div>
            <div className="relative mt-auto flex flex-col gap-3">
              <span className="flex gap-1">
                {next.exercises.map((ok, i) => (
                  <motion.span
                    key={i}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className={cn('h-1.5 flex-1 origin-left rounded-full', ok ? 'bg-indigo-500' : 'bg-black/[0.06] dark:bg-white/[0.08]')}
                  />
                ))}
              </span>
              <span className="flex items-center justify-between">
                <GemChip gems={next.gems} />
                <span className="flex items-center gap-1 text-sm font-bold text-indigo-600 transition-all group-hover:gap-2 dark:text-indigo-300">
                  {next.started ? t('resume') : t('start')} <ArrowRight size={14} />
                </span>
              </span>
            </div>
          </>
        ) : (
          <p className="relative mt-auto flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400"><Trophy size={16} /> {t('grammar_all_done')}</p>
        )}
      </section>
    </Cell>
  )
}

// ── Verb of the day ───────────────────────────────────────────────────────────

function VerbCard({ verb, languageCode, wide }: { verb: NonNullable<DashboardData['verb']>; languageCode: string; wide: boolean }) {
  const t = useTranslations('dashboard')
  const [playing, setPlaying] = useState<number | null>(null)
  function say(i: number) {
    setPlaying(i)
    speak(speakableForm(verb.forms[i]), languageCode, { onEnd: () => setPlaying(p => (p === i ? null : p)) })
  }
  return (
    <Cell className={cn('col-span-12 md:col-span-6', wide ? 'lg:col-span-8' : 'lg:col-span-4')}>
      <section className={cn(SURFACE, 'flex flex-col gap-3 p-5')}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(LABEL, 'flex items-center gap-1.5')}><BookType size={14} className="text-primary" /> {t('verb_title')}</p>
          {verb.aux && <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">{verb.aux}</span>}
        </div>
        <button type="button" onClick={() => speak(verb.infinitive, languageCode)} className="group/v flex items-baseline gap-2 text-left">
          <span className="text-2xl font-black italic text-slate-900 transition-colors group-hover/v:text-primary dark:text-white">{verb.infinitive}</span>
          <Volume2 size={15} className="shrink-0 text-slate-300 transition-colors group-hover/v:text-primary" />
        </button>
        <p className="-mt-2 text-sm text-slate-500 dark:text-slate-400">{verb.translation} · <span className="text-slate-400">{verb.tense}</span></p>
        <div className="grid grid-cols-2 gap-1">
          {verb.forms.map((f, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => say(i)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'truncate rounded-lg px-2 py-1 text-left text-sm font-semibold italic transition-colors',
                playing === i ? 'bg-primary text-white' : 'bg-slate-50 text-slate-700 hover:bg-primary/10 hover:text-primary dark:bg-white/[0.04] dark:text-slate-200',
              )}
            >
              {speakableForm(f)}
            </motion.button>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link
            href={`/verbs/practice?verb=${verb.id}`}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:opacity-95"
          >
            <Zap size={14} /> {t('verb_practice')}
          </Link>
          <Link href="/verbs" className="flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/[0.06] dark:hover:text-white">
            {t('verb_all')}
          </Link>
        </div>
      </section>
    </Cell>
  )
}

// ── Mini-games ────────────────────────────────────────────────────────────────

function GamesCard({ wide }: { wide: boolean }) {
  const t = useTranslations('dashboard')
  const games = [
    { href: '/mini-games/vocabulary', icon: Sparkles, label: t('game_vocab') },
    { href: '/verbs/practice', icon: BookType, label: t('game_verbs') },
    { href: '/mini-games/speedround', icon: Zap, label: t('game_speed') },
    { href: '/mini-games/monkeytype', icon: Keyboard, label: t('game_typing') },
  ]
  return (
    <Cell className={cn('col-span-12', wide ? 'lg:col-span-8' : 'md:col-span-12 lg:col-span-4')}>
      <section
        className="relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl p-5 text-white shadow-[0_8px_24px_rgba(124,58,237,0.25)]"
        style={{ background: 'linear-gradient(140deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/80">{t('games_title')}</p>
          <Link href="/mini-games" className="flex items-center gap-1 text-xs font-bold text-white/85 hover:text-white">{t('games_all')} <ArrowRight size={12} /></Link>
        </div>
        <p className="relative -mt-2 text-sm text-white/80">{t('games_text')}</p>
        <GamesArt />
        <div className="relative mt-auto grid grid-cols-2 gap-2">
          {games.map(({ href, icon: Icon, label }, i) => (
            <Link key={href} href={href}>
              <motion.span
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.35 + i * 0.05 }}
                className="flex h-full items-center gap-2 rounded-2xl bg-white/15 p-2.5 text-sm font-bold backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon size={15} /></span>
                <span className="leading-tight">{label}</span>
              </motion.span>
            </Link>
          ))}
        </div>
      </section>
    </Cell>
  )
}

/** Little game tiles floating in the free space of the card */
function GamesArt() {
  const tiles = [
    { icon: Gamepad2, x: '8%', y: 4, r: -8, d: 0 },
    { icon: Trophy, x: '38%', y: 18, r: 6, d: 0.5 },
    { icon: Sparkles, x: '66%', y: 0, r: -4, d: 1 },
  ]
  return (
    <div aria-hidden className="pointer-events-none relative hidden h-16 lg:block">
      {tiles.map(({ icon: Icon, x, y, r, d }, i) => (
        <motion.span
          key={i}
          className="absolute flex size-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm"
          style={{ left: x, top: y, rotate: r }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: d, ease: 'easeInOut' }}
        >
          <Icon size={22} />
        </motion.span>
      ))}
    </div>
  )
}

// ── This week ─────────────────────────────────────────────────────────────────

function WeekCard({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const days = useWeekdays(locale)
  const goal = data.dailyGoalMinutes * XP_PER_GOAL_MINUTE
  const max = Math.max(...data.weekXp, goal, 1)
  const total = data.weekXp.reduce((a, b) => a + b, 0)
  const active = data.weekActive.filter(Boolean).length
  const best = Math.max(...data.weekXp)
  return (
    <Cell className="col-span-12 lg:col-span-7" href="/progress">
      <section className={cn(SURFACE, 'flex flex-col gap-4 p-5 md:p-6')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={LABEL}>{t('week_title')}</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">
              {total.toLocaleString(locale)} <span className="text-base font-bold text-primary">XP</span>
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{active}<span className="text-slate-400">/7</span></p>
              <p className="text-[11px] font-semibold text-slate-400">{t('week_active')}</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{best.toLocaleString(locale)}</p>
              <p className="text-[11px] font-semibold text-slate-400">{t('week_best')}</p>
            </div>
          </div>
        </div>
        <div>
          <div className="relative flex h-32 items-end gap-2 md:gap-3">
            {/* Daily goal line */}
            <span aria-hidden className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary/30" style={{ bottom: `${(goal / max) * 100}%` }} />
            {data.weekXp.map((xp, i) => {
              const isToday = i === data.todayIndex
              const reached = xp >= goal
              return (
                <motion.div
                  key={i}
                  className={cn(
                    'flex-1 rounded-lg',
                    xp === 0 ? 'bg-black/[0.05] dark:bg-white/[0.06]' : reached ? 'bg-gradient-to-t from-primary to-[#f45d48]' : isToday ? 'bg-primary/80' : 'bg-primary/40',
                  )}
                  style={{ height: `${Math.max((xp / max) * 100, xp > 0 ? 6 : 3)}%`, originY: 1 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  title={`${xp} XP`}
                />
              )
            })}
          </div>
          <div className="mt-1.5 flex gap-2 md:gap-3">
            {days.map((d, i) => (
              <span key={i} className={cn('flex-1 text-center text-[11px] font-bold', i === data.todayIndex ? 'text-primary' : 'text-slate-400')}>{d}</span>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <span className="w-5 border-t-2 border-dashed border-primary/40" /> {t('goal_line', { xp: goal })}
        </p>
      </section>
    </Cell>
  )
}

// ── Study group ───────────────────────────────────────────────────────────────

function GroupCard({ group }: { group: DashboardData['group'] }) {
  const t = useTranslations('dashboard')
  if (!group) {
    return (
      <Cell className="col-span-12 lg:col-span-5" href="/community">
        <section className={cn(SURFACE, 'flex flex-col gap-4 p-5 md:p-6')}>
          <p className={cn(LABEL, 'flex items-center gap-1.5')}><Users size={14} className="text-primary" /> {t('group_title')}</p>
          <div className="flex items-center gap-4">
            <div aria-hidden className="flex -space-x-3">
              {[['#6366f1', '#a855f7'], ['#0ea5e9', '#22d3ee'], ['#f59e0b', '#f97316']].map(([a, b], i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
                  className="size-11 rounded-full border-[3px] border-white dark:border-[#202638]"
                  style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white">{t('group_cta_title')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('group_cta_text')}</p>
            </div>
          </div>
          <span className="mt-auto flex items-center gap-1 text-sm font-bold text-primary transition-all group-hover:gap-2">
            {t('group_cta_button')} <ArrowRight size={14} />
          </span>
        </section>
      </Cell>
    )
  }
  const ranked = [...group.members].sort((a, b) => b.weekXp - a.weekXp)
  const myRank = ranked.findIndex(m => m.isMe) + 1
  const goal = group.members.length * WEEKLY_XP_PER_MEMBER
  const done = group.members.reduce((n, m) => n + m.weekXp, 0)
  return (
    <Cell className="col-span-12 lg:col-span-5" href="/community">
      <section className={cn(SURFACE, 'flex flex-col gap-4 p-5 md:p-6')}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(LABEL, 'flex items-center gap-1.5')}><Users size={14} className="text-primary" /> {t('group_title')}</p>
          <span className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{group.name}</span>
        </div>
        <ol className="flex flex-col gap-1.5">
          {ranked.slice(0, 3).map((m, i) => (
            <li key={m.id} className={cn('flex items-center gap-2.5 rounded-xl px-2 py-1.5', m.isMe && 'bg-primary/[0.07]')}>
              <span className={cn('w-4 text-center text-xs font-black', i === 0 ? 'text-amber-500' : 'text-slate-400')}>{i + 1}</span>
              <MiniAvatar name={m.name} avatar={m.avatar} id={m.id} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{m.isMe ? t('you') : m.name}</span>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">+{m.weekXp} XP</span>
            </li>
          ))}
        </ol>
        {myRank > 3 && <p className="text-xs font-semibold text-slate-500">{t('group_rank', { rank: myRank, n: ranked.length })}</p>}
        <div className="mt-auto">
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><Target size={11} /> {t('group_goal')}</span>
            <span className="tabular-nums">{Math.min(Math.round((done / goal) * 100), 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <motion.div
              className={cn('h-full rounded-full', done >= goal ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-[#e11d48]')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((done / goal) * 100, 100)}%` }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </section>
    </Cell>
  )
}

const AVATAR_GRADIENTS = [['#6366f1', '#a855f7'], ['#0ea5e9', '#22d3ee'], ['#f59e0b', '#f97316'], ['#10b981', '#14b8a6'], ['#ec4899', '#f43f5e'], ['#ff8052', '#e11d48']]

function MiniAvatar({ name, avatar, id }: { name: string; avatar: string | null; id: string }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element -- Google avatar, no next/image domain config needed
    return <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-7 shrink-0 rounded-full object-cover" />
  }
  const [a, b] = AVATAR_GRADIENTS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length]
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// ── Course path ───────────────────────────────────────────────────────────────

function PathCard({ path }: { path: DashboardData['path'] }) {
  const t = useTranslations('dashboard')
  const pct = path.total ? Math.round((path.completed / path.total) * 100) : 0
  return (
    <Cell className="col-span-12 lg:col-span-8" href="/learn">
      <section className={cn(SURFACE, 'flex flex-col gap-4 p-5 md:p-6')}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={cn(LABEL, 'flex items-center gap-1.5')}><MapIcon size={14} className="text-primary" /> {t('path_title')}</p>
          <p className="text-xs font-semibold text-slate-400">{t('path_progress', { done: path.completed, total: path.total })} · {pct}%</p>
        </div>
        <div className="relative">
          {/* Track */}
          <span aria-hidden className="absolute left-6 right-6 top-6 h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          <ol className="relative flex justify-between gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {path.modules.map((m, i) => {
              const index = path.start + i
              const isCurrent = m.state === 'current'
              return (
                <li key={m.slug} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                    transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { ...spring, delay: 0.3 + i * 0.05 }}
                    className={cn(
                      'relative flex size-12 items-center justify-center rounded-2xl text-xl',
                      m.state === 'completed' && 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25',
                      isCurrent && 'bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20',
                      m.state === 'available' && 'border-2 border-primary/30 bg-white shadow-sm dark:bg-[#202638]',
                      m.state === 'locked' && 'bg-slate-100 text-slate-300 dark:bg-white/[0.05] dark:text-slate-600',
                    )}
                  >
                    {m.state === 'completed' ? <Check size={20} strokeWidth={3} /> : m.state === 'locked' ? <Lock size={16} /> : m.icon}
                  </motion.span>
                  <span className={cn('text-[10px] font-black tabular-nums', isCurrent ? 'text-primary' : 'text-slate-400')}>{t('lesson_n', { n: index + 1 })}</span>
                  <span className={cn('line-clamp-2 text-[11px] font-semibold leading-tight', isCurrent || m.state === 'available' ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{m.title}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </Cell>
  )
}

// ── Saved study links ─────────────────────────────────────────────────────────

const PLATFORM: Record<string, string> = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', other: 'Link' }

function SavedCard({ saved }: { saved: DashboardData['saved'] }) {
  const t = useTranslations('dashboard')
  return (
    <Cell className="col-span-12 lg:col-span-4" href="/saved">
      <section className={cn(SURFACE, 'flex flex-col gap-3 p-5')}>
        <div className="flex items-center justify-between">
          <p className={cn(LABEL, 'flex items-center gap-1.5')}><Bookmark size={14} className="text-primary" /> {t('saved_title')}</p>
          {saved && <span className="text-[11px] font-bold text-slate-400">{t('saved_count', { n: saved.count })}</span>}
        </div>
        {saved ? (
          <div className="flex items-center gap-3">
            <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/[0.05]">
              {saved.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element -- remote video thumbnail
                <img src={saved.thumbnail} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
              )}
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{saved.title ?? PLATFORM[saved.platform] ?? saved.platform}</span>
              <span className="text-xs text-slate-400">{PLATFORM[saved.platform] ?? saved.platform}</span>
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('saved_empty')}</p>
        )}
        <span className="mt-auto flex items-center gap-1 text-sm font-bold text-primary transition-all group-hover:gap-2">
          {t('saved_open')} <ArrowRight size={14} />
        </span>
      </section>
    </Cell>
  )
}
