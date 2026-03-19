'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, ChevronRight, Zap,
  Bot, Gem, Gamepad2, RefreshCw, BookMarked,
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
            </div>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              VIDEO CLIP (row-span-2)
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-3 md:row-span-2 relative overflow-hidden flex flex-col min-h-[180px] cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
            style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {}}
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
              STREAK
          ────────────────────────────────────────────────────────────────── */}
          <Block
            whileHover={{ rotate: '2.5deg', scale: 1.07 }}
            className="col-span-3 md:col-span-2 bg-primary dark:bg-primary border-primary/20 flex flex-col items-center justify-center gap-1 min-h-[120px] p-4 cursor-default"
          >
            <span className="text-[2rem] leading-none select-none">🔥</span>
            <p className="text-[1.75rem] font-bold leading-none text-white tabular-nums">{stats.streak}</p>
            <p className="text-[10px] font-bold text-white/70 mt-0.5">day streak</p>
          </Block>

          {/* ──────────────────────────────────────────────────────────────────
              QUICK PRACTICE
          ────────────────────────────────────────────────────────────────── */}
          <Block
            whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
            className="col-span-3 md:col-span-2 border-amber-400/30 flex flex-col items-center justify-center gap-1 min-h-[120px] p-4 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)' }}
          >
            <Link href="/review" className="flex flex-col items-center gap-1 w-full">
              <Zap size={22} className="text-white" />
              <p className="text-[13px] font-bold text-white text-center leading-tight">Quick Practice</p>
              <p className="text-[10px] font-semibold text-white/80">2 min</p>
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

          {/* ──────────────────────────────────────────────────────────────────
              SHORT STORY
          ────────────────────────────────────────────────────────────────── */}
          <Block
            className="col-span-6 md:col-span-4 relative overflow-hidden p-5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            style={{ background: 'linear-gradient(150deg, #1e1b4b 0%, #3730a3 100%)' }}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                <BookMarked size={11} /> Short Story
              </span>
              <span className="text-[10px] font-semibold text-indigo-400">🇪🇸 ES</span>
            </div>
            <div className="my-3">
              <p className="text-sm font-medium text-white/90 leading-relaxed line-clamp-3 italic">
                "Era una tarde tranquila en el mercado cuando Elena vio algo que cambiaría su vida para siempre…"
              </p>
            </div>
            <Link href="/learn">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold py-2 rounded-xl text-xs backdrop-blur-sm"
              >
                Read story <ArrowRight size={12} />
              </motion.button>
            </Link>
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
              LESSONS — wider card (row-span-2 alongside This Week)
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 md:row-span-2 p-5 flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lessons</p>
              <Link href="/learn" className="flex items-center gap-1 text-primary text-[11px] font-semibold hover:opacity-70 transition-opacity">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
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
              WEEKLY ACTIVITY CHART — reduced width
          ────────────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-8 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
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


        </motion.div>
      </main>
    </div>
  )
}
