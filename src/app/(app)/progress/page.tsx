'use client'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BookOpen, Flame, Star, Target, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Placeholder data — will be replaced with real Supabase data once auth is active
const streak = 0
const longestStreak = 0
const totalXp = 0
const totalCompleted = 0
const avgScore = 0
const wordsLearned = 0
const dailyValues = [0, 0, 0, 0, 0, 0, 0]
const maxVal = Math.max(...dailyValues, 1)

const recentProgress: Array<{
  id: string
  completed_at: string | null
  score: number | null
  lesson: { title: string; type: string; module: { title: string } } | null
}> = []

const LESSON_TYPE_ICON: Record<string, string> = {
  vocabulary: '🗂️',
  phrases: '💬',
  qa: '❓',
  story: '📖',
}

const milestones = [
  { label: '1st Lesson', target: 1, icon: '🎯', achieved: totalCompleted >= 1 },
  { label: '10 Lessons', target: 10, icon: '📚', achieved: totalCompleted >= 10 },
  { label: '50 XP', target: 50, icon: '⭐', achieved: totalXp >= 50 },
  { label: '7-Day Streak', target: 7, icon: '🔥', achieved: longestStreak >= 7 },
  { label: '50 Words', target: 50, icon: '🗂️', achieved: wordsLearned >= 50 },
  { label: '100 XP', target: 100, icon: '🏆', achieved: totalXp >= 100 },
]

export default function ProgressPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center px-4 md:px-8 py-4 md:py-5 justify-between sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl md:text-2xl font-bold">Progress</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── Streak hero ── */}
          {streak > 0 ? (
            <div className="relative bg-primary rounded-3xl p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <div className="text-5xl">🔥</div>
                <div>
                  <p className="text-4xl font-bold leading-none">{streak}</p>
                  <p className="text-sm text-white/70 mt-1 font-medium">Day Streak — keep it up!</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">🔥</div>
                <div>
                  <p className="font-bold">Start your streak today</p>
                  <p className="text-sm text-white/60 mt-0.5">Complete a lesson to light the flame</p>
                </div>
                <Link href="/learn" className="ml-auto shrink-0">
                  <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">
                    Start →
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Flame, label: 'Day Streak', value: streak, suffix: '', color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { icon: Zap, label: 'Total XP', value: totalXp, suffix: '', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
              { icon: BookOpen, label: 'Lessons Done', value: totalCompleted, suffix: '', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { icon: Target, label: 'Avg Accuracy', value: avgScore, suffix: '%', color: 'text-green-500', bg: 'bg-green-500/10' },
              { icon: Star, label: 'Words Learned', value: wordsLearned, suffix: '', color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { icon: TrendingUp, label: 'Best Streak', value: longestStreak, suffix: ' days', color: 'text-primary', bg: 'bg-primary/10' },
            ].map(s => (
              <div
                key={s.label}
                className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-4 flex items-center gap-3"
              >
                <div className={`size-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <div className="min-w-0">
                  <p className={`text-2xl font-bold ${s.color} leading-none`}>{s.value}{s.suffix}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Weekly Activity ── */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">Weekly Activity</h2>
              <span className="text-xs text-muted-foreground">
                {dailyValues.filter(v => v > 0).length} / 7 days active
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {dailyValues.map((val, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    style={{ height: `${Math.max((val / maxVal) * 80, 6)}px` }}
                    className={`w-full rounded-t-lg transition-all ${val > 0 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-700'}`}
                  />
                  <span className="text-[10px] text-muted-foreground font-medium">{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Milestones ── */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Milestones</h2>
              <span className="text-xs text-muted-foreground">
                {milestones.filter(m => m.achieved).length} / {milestones.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {milestones.map(m => (
                <div
                  key={m.label}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all ${
                    m.achieved
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-white dark:bg-slate-800/50 border-primary/5 opacity-50 grayscale'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <p className="text-[11px] font-bold leading-tight">{m.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Recent Lessons ── */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Recent Lessons</h2>
            {recentProgress.length > 0 ? (
              <div className="space-y-2">
                {recentProgress.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-primary/5">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                      {LESSON_TYPE_ICON[p.lesson?.type ?? ''] ?? '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.lesson?.title ?? 'Lesson'}</p>
                      <p className="text-xs text-muted-foreground">{p.lesson?.module?.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{p.score ?? 0}%</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.completed_at ? new Date(p.completed_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 flex flex-col items-center justify-center py-12 gap-3 text-center">
                <span className="text-4xl">📊</span>
                <p className="font-bold">No activity yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Complete your first lesson to start tracking progress
                </p>
                <Link href="/learn">
                  <button className="mt-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                    Start learning →
                  </button>
                </Link>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
