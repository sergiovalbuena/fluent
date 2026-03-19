'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, Flame, Gem, Star, Target, TrendingUp, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ProgressRow = {
  lesson_id: string
  completed_at: string | null
  score: number | null
  lesson: { title: string; type: string; module: { title: string } } | null
}

export type ProgressData = {
  streak: number
  longestStreak: number
  totalXp: number
  totalCompleted: number
  avgScore: number
  wordsLearned: number
  dailyValues: number[]
  recentProgress: ProgressRow[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const LESSON_TYPE_ICON: Record<string, string> = {
  vocabulary: '🗂️',
  phrases: '💬',
  qa: '❓',
  story: '📖',
  arrange: '🔀',
  translate: '✍️',
}

const MILESTONES = (d: ProgressData) => [
  { id: 'first-lesson', label: '1st Lesson',   icon: '🎯', achieved: d.totalCompleted >= 1,  gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' },
  { id: 'ten-lessons',  label: '10 Lessons',   icon: '📚', achieved: d.totalCompleted >= 10, gradient: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)' },
  { id: 'fifty-xp',     label: '50 XP',        icon: '⭐', achieved: d.totalXp >= 50,        gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { id: 'week-streak',  label: '7-Day Streak', icon: '🔥', achieved: d.longestStreak >= 7,   gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)' },
  { id: 'fifty-words',  label: '50 Words',     icon: '🗂️', achieved: d.wordsLearned >= 50,  gradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' },
  { id: 'hundred-xp',  label: '100 XP',       icon: '🏆', achieved: d.totalXp >= 100,       gradient: 'linear-gradient(135deg, #059669 0%, #16a34a 100%)' },
]

// ── Block primitive ───────────────────────────────────────────────────────────
type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps
const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.5, y: 50, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1 },
    }}
    transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#2c1a12]',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const

// ── Component ─────────────────────────────────────────────────────────────────
export function ProgressContent({ data }: { data: ProgressData }) {
  const {
    streak, longestStreak, totalXp, totalCompleted,
    avgScore, wordsLearned, dailyValues, recentProgress,
  } = data

  const maxActivity     = Math.max(...dailyValues, 1)
  const weekDaysActive  = dailyValues.filter(v => v > 0).length
  const todayIdx        = (new Date().getDay() + 6) % 7
  const totalSessions   = dailyValues.reduce((a, b) => a + b, 0)
  const bestDayIdx      = dailyValues.indexOf(Math.max(...dailyValues))
  const avgPerActiveDay = weekDaysActive > 0 ? Math.round(totalSessions / weekDaysActive) : 0

  let currentRun = 0
  for (let i = todayIdx; i >= 0; i--) {
    if (dailyValues[i] > 0) currentRun++
    else break
  }

  const milestones    = MILESTONES(data)
  const achievedCount = milestones.filter(m => m.achieved).length

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Progress" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Streak Hero (row-span-2) ─────────────────────────────────────── */}
          <Block
            className="col-span-12 md:col-span-4 md:row-span-2 relative overflow-hidden flex flex-col justify-between p-6 md:p-8 min-h-[200px] md:min-h-0"
            style={
              streak > 0
                ? { background: 'linear-gradient(160deg, #1c0704 0%, #7c2d12 55%, #9a3412 100%)' }
                : { background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)' }
            }
          >
            {/* Grain */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />

            {/* Status label */}
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                <span className={cn('size-1.5 rounded-full', streak > 0 ? 'bg-orange-400 animate-pulse' : 'bg-indigo-400')} />
                {streak > 0 ? 'Active Streak' : 'No Streak Yet'}
              </span>
            </div>

            {/* Main content */}
            <div className="relative flex-1 flex flex-col justify-center gap-1.5 py-6">
              {streak > 0 ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-7xl md:text-8xl font-bold text-white leading-none tabular-nums">{streak}</span>
                    <span className="text-3xl">🔥</span>
                  </div>
                  <p className="text-sm text-white/50 font-semibold mt-1">day streak — keep it up!</p>
                  <p className="text-[11px] text-white/30 mt-0.5 tabular-nums">Best: {longestStreak} days</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">🔥</div>
                  <p className="text-xl font-bold text-white leading-tight">Start your streak today</p>
                  <p className="text-sm text-white/45 mt-1 leading-snug">Complete a lesson to light the flame</p>
                </>
              )}
            </div>

            {/* CTA */}
            <div className="relative">
              <Link href="/learn">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/[0.18] border border-white/15 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  {streak > 0 ? 'Keep going' : 'Start learning'} <ArrowRight size={14} />
                </motion.button>
              </Link>
            </div>
          </Block>

          {/* ── Total XP ─────────────────────────────────────────────────────── */}
          <Block
            whileHover={tiltL}
            className="col-span-6 md:col-span-5 border-amber-500/20 relative overflow-hidden flex flex-col justify-between p-4 md:p-5 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 100%)' }}
          >
            <div className="absolute right-3 bottom-3 pointer-events-none select-none">
              <Zap size={56} className="text-white/[0.07]" />
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-amber-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Total XP</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">{totalXp}</p>
              <p className="text-[11px] text-white/40 mt-1">experience points</p>
            </div>
          </Block>

          {/* ── Avg Accuracy ─────────────────────────────────────────────────── */}
          <Block
            whileHover={tiltR}
            className="col-span-6 md:col-span-3 border-emerald-500/20 relative overflow-hidden flex flex-col justify-between p-4 md:p-5 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}
          >
            <div className="absolute right-3 bottom-3 pointer-events-none select-none">
              <Target size={56} className="text-white/[0.07]" />
            </div>
            <div className="flex items-center gap-1.5">
              <Target size={12} className="text-emerald-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Accuracy</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">
                {avgScore}<span className="text-2xl font-semibold text-white/50">%</span>
              </p>
              <p className="text-[11px] text-white/40 mt-1">avg score</p>
            </div>
          </Block>

          {/* ── Lessons Done ─────────────────────────────────────────────────── */}
          <Block
            whileHover={tiltL}
            className="col-span-6 md:col-span-4 border-blue-500/20 relative overflow-hidden flex flex-col justify-between p-4 md:p-5 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)' }}
          >
            <div className="absolute right-3 bottom-3 pointer-events-none select-none">
              <BookOpen size={56} className="text-white/[0.07]" />
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen size={12} className="text-blue-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Lessons</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">{totalCompleted}</p>
              <p className="text-[11px] text-white/40 mt-1">completed</p>
            </div>
          </Block>

          {/* ── Words Learned ────────────────────────────────────────────────── */}
          <Block
            whileHover={tiltR}
            className="col-span-6 md:col-span-4 border-violet-500/20 relative overflow-hidden flex flex-col justify-between p-4 md:p-5 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' }}
          >
            <div className="absolute right-3 bottom-3 pointer-events-none select-none">
              <Star size={56} className="text-white/[0.07]" />
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-violet-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Words</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">{wordsLearned}</p>
              <p className="text-[11px] text-white/40 mt-1">words learned</p>
            </div>
          </Block>

          {/* ── Weekly Activity Chart ────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-8 p-5 md:p-6 flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">This week</p>
              <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-bold text-primary tabular-nums">{weekDaysActive} / 7 days</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
              <div className="flex flex-col gap-0.5">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{totalSessions}</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">sessions</p>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-black/[0.06] dark:border-white/[0.06] pl-3">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{avgPerActiveDay || '—'}</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">avg / active day</p>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-black/[0.06] dark:border-white/[0.06] pl-3">
                <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: currentRun > 0 ? 'var(--primary)' : undefined }}>
                  {currentRun > 0 ? `${currentRun}🔥` : DAYS[bestDayIdx]}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {currentRun > 0 ? 'day run' : 'best day'}
                </p>
              </div>
            </div>

            {/* Chart — animated bars */}
            <div className="flex items-end gap-2 md:gap-3 flex-1 min-h-[80px]">
              {dailyValues.map((v, i) => {
                const isToday = i === todayIdx
                const isBest  = i === bestDayIdx && v > 0
                const pct     = v / maxActivity
                return (
                  <div key={DAYS[i] + i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                    <motion.span
                      className={cn(
                        'text-[10px] font-bold tabular-nums',
                        v > 0 ? (isToday ? 'text-primary' : 'text-slate-400 dark:text-slate-500') : 'text-transparent'
                      )}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                    >
                      {v > 0 ? v : '0'}
                    </motion.span>
                    <div className="flex-1 w-full flex items-end">
                      <motion.div
                        style={{ height: `${Math.max(pct * 100, v > 0 ? 8 : 4)}%` }}
                        className={cn(
                          'w-full rounded-lg',
                          isToday && v > 0 ? 'bg-primary shadow-sm shadow-primary/30'
                          : isBest            ? 'bg-primary/75'
                          : v > 0             ? 'bg-primary/45'
                          : 'bg-slate-100 dark:bg-white/[0.06]'
                        )}
                        initial={{ scaleY: 0, originY: '100%' }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.3 + i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
                      />
                    </div>
                    <span className={cn('text-[10px] font-bold shrink-0', isToday ? 'text-primary' : 'text-slate-400 dark:text-slate-500')}>
                      {DAYS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </Block>

          {/* ── Best Streak ──────────────────────────────────────────────────── */}
          <Block
            className="col-span-12 md:col-span-4 border-orange-600/20 relative overflow-hidden flex flex-col justify-between p-5 md:p-6 min-h-[140px]"
            style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #ea580c 100%)' }}
          >
            <div className="absolute right-4 bottom-4 pointer-events-none select-none">
              <TrendingUp size={64} className="text-white/[0.06]" />
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-orange-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Best Streak</p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-bold text-white tabular-nums leading-none">{longestStreak}</p>
                <p className="text-lg text-white/45 font-semibold">days</p>
              </div>
              <p className="text-[11px] text-white/35 mt-1">personal record</p>
            </div>
          </Block>

          {/* ── Milestones label ─────────────────────────────────────────────── */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
            className="col-span-12 flex items-center justify-between px-1 pt-1"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Milestones</p>
            <p className="text-[10px] font-bold text-primary tabular-nums">{achievedCount} / {milestones.length} unlocked</p>
          </motion.div>

          {/* ── Milestone tiles ──────────────────────────────────────────────── */}
          {milestones.map(({ id, label, icon, achieved, gradient }, i) => (
            <Block
              key={id}
              whileHover={achieved ? (i % 2 === 0 ? tiltL : tiltR) : {}}
              className={cn(
                'col-span-4 md:col-span-2 flex flex-col items-center justify-center gap-2 min-h-[100px] p-3 text-center',
                !achieved && 'shadow-none'
              )}
              style={achieved ? { background: gradient, border: 'none' } : {}}
            >
              <span className={cn('text-2xl leading-none', !achieved && 'grayscale opacity-30')}>
                {icon}
              </span>
              <p className={cn(
                'text-[11px] font-bold leading-tight',
                achieved ? 'text-white' : 'text-slate-400 dark:text-slate-600'
              )}>
                {label}
              </p>
              {achieved && (
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/55 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-full">
                  Unlocked
                </span>
              )}
            </Block>
          ))}

          {/* ── How Points Work ──────────────────────────────────────────────── */}
          <Link href="/progress/points" className="col-span-12">
            <Block
              whileHover={{ scale: 1.015, filter: 'brightness(1.08)' }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden flex items-center justify-between p-5 md:p-6 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)' }}
            >
              <div className="absolute right-5 bottom-0 pointer-events-none select-none opacity-[0.07]">
                <Zap size={80} className="text-white" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Star size={16} className="text-amber-400" />
                  <Gem size={16} className="text-cyan-400" />
                  <Flame size={16} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">How Points Work</p>
                  <p className="text-[11px] text-white/45 mt-0.5">XP, stars, gems, streaks & skills explained</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-white/50 shrink-0 relative z-10" />
            </Block>
          </Link>

          {/* ── Recent Lessons ───────────────────────────────────────────────── */}
          <Block className="col-span-12 p-5 flex flex-col gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Recent Lessons</p>
              <Link href="/learn" className="text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity">
                Browse all →
              </Link>
            </div>

            {recentProgress.length > 0 ? (
              recentProgress.map(p => (
                <div
                  key={p.lesson_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-primary/[0.04] dark:hover:bg-primary/[0.06] transition-colors"
                >
                  <div className="size-10 rounded-xl bg-primary/[0.08] dark:bg-primary/[0.12] flex items-center justify-center text-lg shrink-0">
                    {LESSON_TYPE_ICON[p.lesson?.type ?? ''] ?? '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{p.lesson?.title ?? 'Lesson'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{p.lesson?.module?.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary tabular-nums">{p.score ?? 0}%</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {p.completed_at
                        ? new Date(p.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <span className="text-4xl">📊</span>
                <p className="font-bold text-slate-900 dark:text-white">No activity yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                  Complete your first lesson to start tracking progress
                </p>
                <Link href="/learn">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-sm shadow-primary/25"
                  >
                    Start learning →
                  </motion.button>
                </Link>
              </div>
            )}
          </Block>

        </motion.div>
      </main>
    </div>
  )
}
