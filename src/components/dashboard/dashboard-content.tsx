'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, ChevronRight, Target, Zap,
  Bot, Gem, Gamepad2, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

export type Module = {
  id: string
  slug: string
  title: string
  icon: string
  description?: string
  totalLessons: number
  completedLessons: number
  progress: number
}

export type DashboardStats = {
  streak: number
  totalXp: number
  lessonsCompleted: number
  avgAccuracy: number | null
  weekActivity: number[]
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ── Block primitive ────────────────────────────────────────────────────────────
// Mirrors the RevealBento pattern: spring pop entrance + optional tilt hover.
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function DashboardContent({ modules, stats }: { modules: Module[]; stats: DashboardStats }) {
  const current = modules[0] ?? null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const weekDaysActive = stats.weekActivity.filter(v => v > 0).length
  const maxActivity = Math.max(...stats.weekActivity, 1)

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title={`${greeting} 👋`} />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ──────────────────────────────────────────────────────────────────
              HERO — Continue Learning
              col-span-12 mobile · col-span-8 desktop
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-8 relative overflow-hidden p-6 md:p-8 min-h-[200px] flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            {/* Emoji watermark */}
            <div className="absolute right-0 top-0 bottom-0 w-44 md:w-60 flex items-center justify-end overflow-hidden pointer-events-none select-none">
              <span className="text-[9rem] md:text-[11rem] leading-none opacity-[0.065] dark:opacity-[0.055] translate-x-6 md:translate-x-10">
                {current?.icon ?? '📚'}
              </span>
            </div>

            <div className="relative">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-4">
                {current ? 'Continue Learning' : 'Get Started'}
              </span>
              <h2 className="text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white mb-1">
                {current?.title ?? 'Start your first lesson'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {current
                  ? `${current.completedLessons} of ${current.totalLessons} lessons completed`
                  : 'Pick a language module and begin'}
              </p>
            </div>

            <div className="relative mt-5">
              {current && (
                <div className="mb-4 max-w-sm">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                    <span>Progress</span>
                    <span>{current.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${current.progress}%` }}
                      transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                    />
                  </div>
                </div>
              )}
              <Link href={current ? `/learn/${current.slug}` : '/learn'}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm shadow-primary/30"
                >
                  {current ? 'Start Lesson' : 'Browse Lessons'}
                  <ArrowRight size={15} />
                </motion.button>
              </Link>
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              STREAK — colored tile, tilt hover
              col-span-6 mobile · col-span-4 desktop
          ────────────────────────────────────────────────────────────────── */}
          <Block
            whileHover={{ rotate: '2.5deg', scale: 1.07 }}
            className="col-span-6 md:col-span-4 bg-primary dark:bg-primary border-primary/20 flex flex-col items-center justify-center gap-1 min-h-[180px] p-6 cursor-default"
          >
            <span className="text-[3.25rem] leading-none select-none">🔥</span>
            <p className="text-[2.75rem] font-bold leading-none text-white tabular-nums">{stats.streak}</p>
            <p className="text-sm font-bold text-white/70 mt-0.5">day streak</p>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              STAT — XP
              col-span-6 mobile · col-span-4 desktop
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-6 md:col-span-4 p-5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="size-10 rounded-2xl bg-amber-400/10 flex items-center justify-center">
              <Zap size={18} className="text-amber-500" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold leading-none text-slate-900 dark:text-white tabular-nums">
                {stats.totalXp.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Total XP</p>
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              STAT — Lessons done
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-6 md:col-span-4 p-5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="size-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <BookOpen size={18} className="text-indigo-500" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold leading-none text-slate-900 dark:text-white tabular-nums">
                {stats.lessonsCompleted}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Lessons done</p>
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              STAT — Accuracy
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-6 md:col-span-4 p-5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="size-10 rounded-2xl bg-teal-500/10 flex items-center justify-center">
              <Target size={18} className="text-teal-500" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold leading-none text-slate-900 dark:text-white tabular-nums">
                {stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—'}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Accuracy</p>
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              WEEKLY ACTIVITY CHART
              col-span-12 full width
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                This week
              </p>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                {weekDaysActive} / 7 days
              </span>
            </div>
            <div className="flex items-end gap-2 h-14">
              {stats.weekActivity.map((v, i) => (
                <div key={DAYS[i] + i} className="flex flex-col items-center gap-1.5 flex-1">
                  <motion.div
                    style={{ height: `${Math.max((v / maxActivity) * 44, 4)}px` }}
                    className={cn(
                      'w-full rounded-md',
                      v > 0 ? 'bg-primary' : 'bg-slate-100 dark:bg-white/[0.06]'
                    )}
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.4 + i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    {DAYS[i]}
                  </span>
                </div>
              ))}
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              ACTION TILES — colored, tilt hover, 4 across on desktop
              Each: col-span-6 mobile · col-span-3 desktop
          ────────────────────────────────────────────────────────────────── */}

          {/* Play */}
          <Block
            whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
            className="col-span-6 md:col-span-3 bg-indigo-600 dark:bg-indigo-700 border-indigo-500/20 p-0 min-h-[120px]"
          >
            <Link href="/play" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <Gamepad2 size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">Play</p>
            </Link>
          </Block>

          {/* MarIA */}
          <Block
            whileHover={{ rotate: '2.5deg', scale: 1.07 }}
            className="col-span-6 md:col-span-3 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
          >
            <Link href="/maria" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <Bot size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">MarIA</p>
            </Link>
          </Block>

          {/* Gems */}
          <Block
            whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
            className="col-span-6 md:col-span-3 bg-amber-400 dark:bg-amber-500 border-amber-300/40 p-0 min-h-[120px]"
          >
            <Link href="/gems" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <Gem size={36} className="text-amber-950 mx-auto" />
              <p className="font-bold text-sm text-amber-950 text-center tracking-wide">Gems</p>
            </Link>
          </Block>

          {/* Review */}
          <Block
            whileHover={{ rotate: '2.5deg', scale: 1.07 }}
            className="col-span-6 md:col-span-3 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[120px]"
          >
            <Link href="/review" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <RefreshCw size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">Review</p>
            </Link>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              ALL MODULES
              col-span-12 full width
          ────────────────────────────────────────────────────────────────── */}
          {modules.length > 0 && (
            <Block className="col-span-12 p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Lessons</h3>
                <Link
                  href="/learn"
                  className="flex items-center gap-1 text-primary text-xs font-semibold hover:opacity-70 transition-opacity"
                >
                  View all <ChevronRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {modules.map(m => (
                  <motion.div key={m.id} whileHover={{ y: -2 }} transition={{ duration: 0.18 }}>
                    <Link href={`/learn/${m.slug}`}>
                      <div className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#f6f4f2] dark:bg-white/[0.03] hover:bg-primary/[0.06] dark:hover:bg-primary/[0.08] border border-transparent hover:border-primary/[0.12] transition-all duration-200 cursor-pointer">
                        <div className="size-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-xl shrink-0 shadow-sm">
                          {m.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white truncate leading-tight">
                            {m.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${m.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-primary shrink-0 tabular-nums">
                              {m.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </Block>
          )}

        </motion.div>
      </main>
    </div>
  )
}
