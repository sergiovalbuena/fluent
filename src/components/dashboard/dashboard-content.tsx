'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, ChevronRight, Zap,
  Bot, Gem, Gamepad2, RefreshCw, BookMarked, Trophy, Music,
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
type BlockProps = { className?: string; children?: React.ReactNode; onClick?: () => void } & MotionProps

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
export function DashboardContent({ modules, stats, displayName = 'there' }: { modules: Module[]; stats: DashboardStats; displayName?: string }) {
  const current = modules[0] ?? null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = displayName.split(' ')[0]
  const weekDaysActive = stats.weekActivity.filter(v => v > 0).length
  const maxActivity = Math.max(...stats.weekActivity, 1)
  const todayIdx = (new Date().getDay() + 6) % 7 // Mon=0, Sun=6
  const totalSessions = stats.weekActivity.reduce((a, b) => a + b, 0)
  const bestDayIdx = stats.weekActivity.indexOf(maxActivity)
  const avgPerActiveDay = weekDaysActive > 0 ? Math.round(totalSessions / weekDaysActive) : 0
  // Consecutive days ending at today (or yesterday if today is 0)
  let currentRun = 0
  for (let i = todayIdx; i >= 0; i--) {
    if (stats.weekActivity[i] > 0) currentRun++
    else break
  }

  // Shared hover for gradient cards
  const gradientHover = { rotate: '0deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
  const gradientHoverTiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
  const gradientHoverTiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Dashboard" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ──────────────────────────────────────────────────────────────────
              HERO — Welcome
              col-span-12 mobile · col-span-8 desktop
          ────────────────────────────────────────────────────────────────── */}
          {/* ──────────────────────────────────────────────────────────────────
              HERO — Welcome (row-span-2)
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-5 md:row-span-2 relative overflow-hidden p-6 md:p-8 flex flex-col justify-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="absolute right-0 top-0 bottom-0 w-32 md:w-44 flex items-center justify-end overflow-hidden pointer-events-none select-none">
              <span className="text-[7rem] md:text-[9rem] leading-none opacity-[0.065] dark:opacity-[0.055] translate-x-4 md:translate-x-8">
                👋
              </span>
            </div>
            <div className="relative">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
                {greeting}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900 dark:text-white">
                {firstName}!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-[16rem]">
                {stats.streak > 0
                  ? `You're on a ${stats.streak}-day streak — keep it up! 🔥`
                  : 'Ready to learn something new today?'}
              </p>

              {/* CTAs — Resume leads (solid), Quick Practice follows (ghost) */}
              <div className="flex items-center gap-2 mt-5">
                <Link href={current ? `/learn/${current.slug}` : '/learn'}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                  >
                    Resume <ArrowRight size={13} />
                  </motion.button>
                </Link>
                <Link href="/review">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 border border-primary/25 text-primary text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/8 transition-colors"
                  >
                    <Zap size={12} /> Quick Practice
                  </motion.button>
                </Link>
              </div>
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              VIDEO CLIP (row-span-2)
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-3 md:row-span-2 relative overflow-hidden flex flex-col min-h-[180px] cursor-pointer border-indigo-900/30"
            whileHover={{ scale: 1.02, filter: 'brightness(1.14) saturate(1.12)' }}
            whileTap={{ scale: 0.98 }}
            style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)' }}
          >
            {/* Fake thumbnail grain */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: 'cover' }}
            />

            {/* Top label */}
            <div className="relative p-4 pb-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
                <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
                Video Clip
              </span>
            </div>

            {/* Center play button */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
              <div className="size-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="size-6 fill-white ml-0.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white leading-snug">Daily Lesson</p>
                <p className="text-[11px] text-white/50 mt-0.5">5 min · Spanish</p>
              </div>
            </div>

            {/* Bottom */}
            <div className="relative p-4 pt-0">
              <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold">
                Coming soon
              </div>
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              MARIA
          ────────────────────────────────────────────────────────────────── */}
          <Block
            whileHover={gradientHoverTiltL}
            className="col-span-3 md:col-span-2 border-rose-400/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-4 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #e11d48 0%, #db2777 100%)' }}
          >
            <Link href="/maria" className="flex flex-col items-center gap-1 w-full">
              <Bot size={22} className="text-white" />
              <p className="text-[13px] font-bold text-white text-center leading-tight">MarIA</p>
              <p className="text-[10px] font-semibold text-white/70">AI tutor</p>
            </Link>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              QUICK PRACTICE
          ────────────────────────────────────────────────────────────────── */}
          <Block
            whileHover={gradientHoverTiltR}
            className="col-span-3 md:col-span-2 border-amber-400/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-4 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }}
          >
            <Link href="/review" className="flex flex-col items-center gap-1 w-full">
              <Zap size={22} className="text-white" />
              <p className="text-[13px] font-bold text-white text-center leading-tight">Quick Practice</p>
              <p className="text-[10px] font-semibold text-white/70">2 min</p>
            </Link>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              CONTINUE LEARNING — bottom-right
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-6 md:col-span-4 p-5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)] min-h-[120px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Continue Learning</p>
            {current ? (
              <>
                <div className="flex items-center gap-2.5 my-3">
                  <span className="text-2xl leading-none">{current.icon}</span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">{current.title}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${current.progress}%` }}
                        transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums shrink-0">{current.progress}%</span>
                  </div>
                  <Link href={`/learn/${current.slug}`}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-2 rounded-xl text-xs shadow-sm shadow-primary/30"
                    >
                      Resume <ArrowRight size={13} />
                    </motion.button>
                  </Link>
                </div>
              </>
            ) : (
              <Link href="/learn" className="mt-auto">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-2 rounded-xl text-xs shadow-sm shadow-primary/30"
                >
                  Browse Lessons <ArrowRight size={13} />
                </motion.button>
              </Link>
            )}
          </Block>

          {/* ── 4 compact cards — left side, row 1 (col-span-2 each = 8 total) ── */}

          {/* SHORT STORY */}
          <Block
            whileHover={gradientHoverTiltL}
            className="col-span-6 md:col-span-2 border-indigo-500/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-3 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%)' }}
          >
            <Link href="/learn" className="flex flex-col items-center gap-1 w-full">
              <BookMarked size={20} className="text-white" />
              <p className="text-[12px] font-bold text-white text-center leading-tight">Short Story</p>
              <p className="text-[10px] font-semibold text-white/60">5 min · 🇪🇸</p>
            </Link>
          </Block>

          {/* LESSONS DONE */}
          <Block
            whileHover={gradientHoverTiltR}
            className="col-span-6 md:col-span-2 border-sky-400/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-3 cursor-default"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)' }}
          >
            <BookOpen size={20} className="text-white" />
            <p className="text-[1.5rem] font-bold leading-none text-white tabular-nums">{stats.lessonsCompleted}</p>
            <p className="text-[10px] font-semibold text-white/70">Lessons done</p>
          </Block>

          {/* DAILY CHALLENGE */}
          <Block
            whileHover={gradientHoverTiltL}
            className="col-span-6 md:col-span-2 border-emerald-500/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-3 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}
          >
            <Link href="/review" className="flex flex-col items-center gap-1 w-full">
              <Trophy size={20} className="text-white" />
              <p className="text-[12px] font-bold text-white text-center leading-tight">Daily Challenge</p>
              <p className="text-[10px] font-semibold text-white/70">New today</p>
            </Link>
          </Block>

          {/* MUSIC TIME */}
          <Block
            whileHover={gradientHoverTiltR}
            className="col-span-6 md:col-span-2 border-violet-500/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-3 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a21caf 100%)' }}
          >
            <Link href="/play" className="flex flex-col items-center gap-1 w-full">
              <Music size={20} className="text-white" />
              <p className="text-[12px] font-bold text-white text-center leading-tight">Music Time</p>
              <p className="text-[10px] font-semibold text-white/70">3 songs</p>
            </Link>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              LESSONS — right side, col-span-4 row-span-2
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 md:row-span-2 md:col-start-9 p-5 flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]" style={{ maxHeight: '420px' }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lessons</p>
              <Link href="/learn" className="flex items-center gap-1 text-primary text-[11px] font-semibold hover:opacity-70 transition-opacity">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0 flex-1 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20">
              {modules.map(m => (
                <Link key={m.id} href={`/learn/${m.slug}`}>
                  <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-primary/[0.06] dark:hover:bg-primary/[0.08] transition-colors"
                  >
                    <div className="size-9 rounded-xl bg-[#f6f4f2] dark:bg-white/[0.06] flex items-center justify-center text-lg shrink-0">
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{m.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${m.progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-primary tabular-nums shrink-0">{m.progress}%</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
              {modules.length === 0 && (
                <p className="text-xs text-slate-400 text-center mt-4">No lessons yet</p>
              )}
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              WEEKLY ACTIVITY CHART — left side row 2 (col-span-8)
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-8 p-5 md:p-6 flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.05)]">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-baseline gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">This week</p>
              </div>
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

            {/* Chart — flex-1 so it fills remaining height, no dead space */}
            <div className="flex items-end gap-2 md:gap-3 flex-1 min-h-0">
              {stats.weekActivity.map((v, i) => {
                const isToday = i === todayIdx
                const isBest = i === bestDayIdx && v > 0
                const pct = v / maxActivity
                return (
                  <div key={DAYS[i] + i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                    {/* Value label */}
                    <motion.span
                      className={cn('text-[10px] font-bold tabular-nums', v > 0 ? (isToday ? 'text-primary' : 'text-slate-400 dark:text-slate-500') : 'text-transparent')}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                    >
                      {v > 0 ? v : '0'}
                    </motion.span>

                    {/* Bar wrapper — full height container so bar grows from bottom */}
                    <div className="flex-1 w-full flex items-end">
                      <motion.div
                        style={{ height: `${Math.max(pct * 100, v > 0 ? 8 : 4)}%` }}
                        className={cn(
                          'w-full rounded-lg',
                          isToday && v > 0 ? 'bg-primary shadow-sm shadow-primary/30'
                          : isBest ? 'bg-primary/75'
                          : v > 0 ? 'bg-primary/45'
                          : 'bg-slate-100 dark:bg-white/[0.06]'
                        )}
                        initial={{ scaleY: 0, originY: '100%' }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.3 + i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
                      />
                    </div>

                    {/* Day label */}
                    <span className={cn('text-[10px] font-bold shrink-0', isToday ? 'text-primary' : 'text-slate-400 dark:text-slate-500')}>
                      {DAYS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              ACTION TILES — colored, tilt hover, 4 across on desktop
              Each: col-span-6 mobile · col-span-3 desktop
          ────────────────────────────────────────────────────────────────── */}

          {/* Play */}
          <Block
            whileHover={gradientHoverTiltR}
            className="col-span-6 md:col-span-3 border-indigo-500/20 p-0 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            <Link href="/play" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <Gamepad2 size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">Play</p>
            </Link>
          </Block>

          {/* MarIA */}
          <Block
            whileHover={gradientHoverTiltL}
            className="col-span-6 md:col-span-3 border-rose-400/20 p-0 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #e11d48 0%, #db2777 100%)' }}
          >
            <Link href="/maria" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <Bot size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">MarIA</p>
            </Link>
          </Block>

          {/* Gems */}
          <Block
            whileHover={gradientHoverTiltR}
            className="col-span-6 md:col-span-3 border-amber-300/30 p-0 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
          >
            <Link href="/gems" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <Gem size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">Gems</p>
            </Link>
          </Block>

          {/* Review */}
          <Block
            whileHover={gradientHoverTiltL}
            className="col-span-6 md:col-span-3 border-teal-400/20 p-0 min-h-[120px]"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)' }}
          >
            <Link href="/review" className="grid h-full place-content-center gap-3 p-6 min-h-[120px]">
              <RefreshCw size={36} className="text-white mx-auto" />
              <p className="font-bold text-sm text-white text-center tracking-wide">Review</p>
            </Link>
          </Block>


        </motion.div>
      </main>
    </div>
  )
}
