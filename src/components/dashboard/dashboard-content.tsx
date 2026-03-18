'use client'

import { motion, type Variants } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
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

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const weekActivity = [0, 0, 0, 0, 0, 0, 0]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

export function DashboardContent({ modules }: { modules: Module[] }) {
  const current = modules[0] ?? null
  const rest = modules.slice(1)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">

      <AppTopbar title={`${greeting} 👋`} />

      <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* Continue Learning hero */}
              {current ? (
                <motion.div
                  custom={0}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-amber-400 text-white shadow-xl shadow-primary/25"
                >
                  <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
                  <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 pointer-events-none" />

                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[7rem] leading-none opacity-20 pointer-events-none select-none">
                    {current.icon}
                  </div>

                  <div className="relative p-6 md:p-8">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full mb-4">
                      Continue Learning
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-1">{current.title}</h2>
                    <p className="text-white/70 text-sm mb-5">
                      {current.completedLessons} of {current.totalLessons} lessons completed
                    </p>

                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-white/80">Module progress</span>
                        <span>{current.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${current.progress}%` }}
                        />
                      </div>
                    </div>

                    <Link href={`/learn/${current.slug}`}>
                      <button className="flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all active:scale-95 text-sm shadow-lg">
                        Start Lesson
                        <ArrowRight size={16} />
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ) : null}

              {/* Quick stats row */}
              <motion.div
                custom={1}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                {[
                  { icon: Flame, label: 'Day Streak', value: '0', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                  { icon: Zap, label: 'Total XP', value: '0', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                  { icon: BookOpen, label: 'Lessons', value: '0', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { icon: Target, label: 'Accuracy', value: '—', color: 'text-green-500', bg: 'bg-green-500/10' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="bg-white dark:bg-slate-800/60 rounded-2xl border border-primary/5 p-4 flex items-center gap-3"
                  >
                    <div className={`size-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon size={16} className={s.color} />
                    </div>
                    <div>
                      <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* All Lessons */}
              {rest.length > 0 ? (
                <motion.div custom={2} initial="hidden" animate="show" variants={fadeUp}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">All Lessons</h3>
                    <Link href="/learn" className="flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                      View all <ChevronRight size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rest.map((m, i) => (
                      <motion.div key={m.id} custom={i + 3} initial="hidden" animate="show" variants={fadeUp}>
                        <Link href={`/learn/${m.slug}`}>
                          <div className="group flex items-center gap-4 bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-primary/5 hover:border-primary/25 hover:shadow-md transition-all">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl shrink-0 group-hover:bg-primary/20 transition-colors">
                              {m.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{m.title}</p>
                              <p className="text-[11px] text-muted-foreground mb-1.5">
                                {m.completedLessons}/{m.totalLessons} lessons
                              </p>
                              <Progress value={m.progress} className="h-1.5 bg-primary/10 [&>div]:bg-primary" />
                            </div>
                            <span className="text-xs font-bold text-primary shrink-0">{m.progress}%</span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </div>

            {/* ── RIGHT SIDEBAR ────────────────────────────────────────── */}
            <div className="hidden lg:flex flex-col gap-4">

              {/* Streak card */}
              <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp}>
                <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-primary/5 p-6 text-center">
                  <div className="size-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl mx-auto mb-3">
                    🔥
                  </div>
                  <p className="text-4xl font-bold text-orange-500 leading-none">0</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1.5">Day Streak</p>
                  <div className="mt-4 pt-4 border-t border-primary/5">
                    <p className="text-xs text-muted-foreground">Complete a lesson today to start your streak</p>
                  </div>
                </div>
              </motion.div>

              {/* Weekly activity */}
              <motion.div custom={2} initial="hidden" animate="show" variants={fadeUp}>
                <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-primary/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">This Week</p>
                    <span className="text-xs text-muted-foreground">0 / 7 days</span>
                  </div>
                  <div className="flex items-end justify-between gap-1.5 h-16 mb-2">
                    {weekActivity.map((v, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          style={{ height: `${Math.max((v / 1) * 48, 5)}px` }}
                          className={`w-full rounded-t-md ${v > 0 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-700'}`}
                        />
                        <span className="text-[9px] text-muted-foreground font-medium">{DAYS[i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-primary/5 grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">0</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Lessons done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">—</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Avg accuracy</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Lesson types */}
              <motion.div custom={3} initial="hidden" animate="show" variants={fadeUp}>
                <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-primary/5 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Lesson Types</p>
                  <div className="space-y-2">
                    {[
                      { icon: '🗂️', label: 'Vocabulary', sub: 'Flashcards' },
                      { icon: '💬', label: 'Phrases', sub: 'Expressions' },
                      { icon: '❓', label: 'Q&A', sub: 'Quizzes' },
                      { icon: '📖', label: 'Story', sub: 'Read & write' },
                    ].map(t => (
                      <div key={t.label} className="flex items-center gap-3 group">
                        <span className="text-xl w-7 text-center">{t.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold leading-none">{t.label}</p>
                          <p className="text-[10px] text-muted-foreground">{t.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
