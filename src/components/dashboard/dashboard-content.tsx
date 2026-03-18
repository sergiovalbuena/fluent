'use client'

import { motion, type Variants } from 'framer-motion'
import { ArrowRight, BookOpen, ChevronRight, Flame, Target, Zap } from 'lucide-react'
import Link from 'next/link'
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

// Bento stagger container
const bentoContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.065, delayChildren: 0.04 },
  },
}

// Individual tile entrance
const bentoTile: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
  },
}

// Shared card surface classes
const card =
  'bg-white dark:bg-[#2c1a12] rounded-3xl border border-black/[0.04] dark:border-white/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.06),_0_1px_2px_rgba(0,0,0,0.04)]'

export function DashboardContent({ modules, stats }: { modules: Module[]; stats: DashboardStats }) {
  const current = modules[0] ?? null
  const allModules = modules

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const weekDaysActive = stats.weekActivity.filter(v => v > 0).length

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title={`${greeting} 👋`} />

      <main className="flex-1 px-3 md:px-6 py-4 md:py-6">
        <motion.div
          className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3.5 auto-rows-auto"
          variants={bentoContainer}
          initial="hidden"
          animate="show"
        >
          {/* ─────────────────────────────────────────────────────────────────
              HERO — Continue Learning
              2/2 cols mobile · 3/4 cols desktop
          ───────────────────────────────────────────────────────────────── */}
          <motion.div
            variants={bentoTile}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.22 }}
            className="col-span-2 md:col-span-3"
          >
            <Link href={current ? `/learn/${current.slug}` : '/learn'}>
              <div className={`${card} relative overflow-hidden p-6 md:p-8 group cursor-pointer min-h-[192px] flex flex-col justify-between`}>

                {/* Clipped emoji watermark — the signature element */}
                <div className="absolute right-0 top-0 bottom-0 w-40 md:w-52 flex items-center justify-end overflow-hidden pointer-events-none select-none">
                  <span className="text-[8rem] md:text-[10rem] leading-none opacity-[0.065] dark:opacity-[0.06] translate-x-6 md:translate-x-8">
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
                  {current ? (
                    <div className="mb-5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                        <span>Progress</span>
                        <span>{current.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden max-w-sm">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${current.progress}%` }}
                          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-1.5 text-sm font-bold text-primary group-hover:gap-2.5 transition-all duration-200">
                    {current ? 'Start Lesson' : 'Browse Lessons'}
                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────────
              STREAK TILE
          ───────────────────────────────────────────────────────────────── */}
          <motion.div variants={bentoTile} className="col-span-1">
            <div className={`${card} relative overflow-hidden p-5 flex flex-col items-center justify-center gap-1 min-h-[192px]`}>
              {/* Accent bottom rule */}
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <span className="text-[2.5rem] leading-none mb-1 select-none">🔥</span>
              <p className="text-[2.5rem] font-bold leading-none text-slate-900 dark:text-white">{stats.streak}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">day streak</p>
              {stats.streak === 0 && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3 px-3 leading-relaxed">
                  Complete a lesson to start your streak
                </p>
              )}
            </div>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────────
              STAT — XP
          ───────────────────────────────────────────────────────────────── */}
          <motion.div variants={bentoTile} className="col-span-1">
            <div className={`${card} p-4 md:p-5 flex flex-col gap-2.5`}>
              <div className="size-8 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
                <Zap size={15} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{stats.totalXp}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Total XP</p>
              </div>
            </div>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────────
              STAT — Lessons
          ───────────────────────────────────────────────────────────────── */}
          <motion.div variants={bentoTile} className="col-span-1">
            <div className={`${card} p-4 md:p-5 flex flex-col gap-2.5`}>
              <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <BookOpen size={15} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{stats.lessonsCompleted}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Lessons done</p>
              </div>
            </div>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────────
              STAT — Accuracy
          ───────────────────────────────────────────────────────────────── */}
          <motion.div variants={bentoTile} className="col-span-1">
            <div className={`${card} p-4 md:p-5 flex flex-col gap-2.5`}>
              <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Target size={15} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white">
                  {stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Accuracy</p>
              </div>
            </div>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────────
              ACTIVITY CHART — Weekly
          ───────────────────────────────────────────────────────────────── */}
          <motion.div variants={bentoTile} className="col-span-1 md:col-span-1">
            <div className={`${card} p-4 md:p-5 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  This week
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{weekDaysActive}/7</span>
              </div>
              <div className="flex items-end gap-1 h-8">
                {stats.weekActivity.map((v, i) => (
                  <div key={DAYS[i] + i} className="flex flex-col items-center gap-0.5 flex-1">
                    <div
                      style={{ height: `${Math.max((v / Math.max(...stats.weekActivity, 1)) * 26, 3)}px` }}
                      className={`w-full rounded-[3px] transition-all ${
                        v > 0 ? 'bg-primary' : 'bg-slate-100 dark:bg-white/[0.06]'
                      }`}
                    />
                    <span className="text-[8px] font-medium text-slate-400 dark:text-slate-500">
                      {DAYS[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────────
              ALL MODULES — Full-width bento tile
          ───────────────────────────────────────────────────────────────── */}
          {allModules.length > 0 ? (
            <motion.div variants={bentoTile} className="col-span-2 md:col-span-4">
              <div className={`${card} p-5 md:p-6`}>
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
                  {allModules.map((m) => (
                    <motion.div
                      key={m.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Link href={`/learn/${m.slug}`}>
                        <div className="group flex items-center gap-3.5 p-3 rounded-2xl
                          bg-[#f6f4f2] dark:bg-white/[0.03]
                          hover:bg-primary/[0.06] dark:hover:bg-primary/[0.08]
                          border border-transparent hover:border-primary/[0.12]
                          transition-all duration-200 cursor-pointer">
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
              </div>
            </motion.div>
          ) : null}

        </motion.div>
      </main>
    </div>
  )
}
