'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Zap, Clock, Flame, Star, Lock, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const Block = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof motion.div>) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className={cn('rounded-2xl p-5 overflow-hidden', className)}
    {...props}
  >
    {children}
  </motion.div>
)

function useCountdown(targetHour = 0) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const next = new Date()
      next.setHours(targetHour, 0, 0, 0)
      if (now >= next) next.setDate(next.getDate() + 1)
      const diff = Math.floor((next.getTime() - now.getTime()) / 1000)
      setTimeLeft({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetHour])

  return timeLeft
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const STORAGE_KEY_PREFIX = 'fluent_daily_challenge_'

function getTodayKey() {
  return STORAGE_KEY_PREFIX + new Date().toISOString().slice(0, 10)
}

function getWeekDays() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  return days.map((label, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    const key = STORAGE_KEY_PREFIX + d.toISOString().slice(0, 10)
    const isToday = d.toDateString() === today.toDateString()
    const isPast = d < today && !isToday
    return { label, key, isToday, isPast, date: d }
  })
}

const challengeModes = [
  {
    id: 'speed',
    title: 'Speed Vocab',
    description: 'Name 20 words before time runs out',
    icon: Zap,
    gradient: 'from-amber-500 to-orange-600',
    xp: 40,
    time: '60s',
  },
  {
    id: 'grammar',
    title: 'Grammar Blast',
    description: 'Fix 15 grammar errors — fast',
    icon: Star,
    gradient: 'from-violet-500 to-purple-700',
    xp: 50,
    time: '90s',
  },
  {
    id: 'phrase',
    title: 'Phrase Master',
    description: 'Translate 10 real-life phrases',
    icon: Flame,
    gradient: 'from-rose-500 to-pink-700',
    xp: 60,
    time: '2 min',
  },
]

export default function ChallengePage() {
  const { h, m, s } = useCountdown(0)
  const [completedToday, setCompletedToday] = useState(false)
  const [weekDays, setWeekDays] = useState<ReturnType<typeof getWeekDays>>([])
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({})
  const [stats] = useState({ bestStreak: 7, totalXp: 1240, challengesDone: 23 })

  useEffect(() => {
    const days = getWeekDays()
    setWeekDays(days)
    const completed: Record<string, boolean> = {}
    days.forEach(({ key }) => {
      completed[key] = !!localStorage.getItem(key)
    })
    setCompletedToday(!!localStorage.getItem(getTodayKey()))
    setCompletedDays(completed)
  }, [])

  function handleStart(modeId: string) {
    if (completedToday) return
    localStorage.setItem(getTodayKey(), modeId)
    setCompletedToday(true)
    setCompletedDays(prev => ({ ...prev, [getTodayKey()]: true }))
    window.dispatchEvent(new CustomEvent('gems-earned', { detail: { amount: 15, reason: 'Daily Challenge complete! 2× XP' } }))
  }

  return (
    <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#23140f] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="text-primary" size={26} />
            Daily Challenge
          </h1>
          <p className="text-muted-foreground text-sm mt-1">A new challenge every day — earn 2× XP while it's live</p>
        </div>

        <div className="grid grid-flow-dense grid-cols-12 gap-4">

          {/* Hero card — countdown + 2x XP */}
          <Block
            className="col-span-12 md:col-span-7 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative"
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
          >
            <div className="absolute top-4 right-4 bg-primary text-white text-xs font-black px-2.5 py-1 rounded-full tracking-wide">
              2× XP
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-slate-400" />
              <span className="text-slate-300 text-sm font-medium">Resets in</span>
            </div>
            <div className="text-5xl font-black tabular-nums tracking-tight text-white mb-4">
              {pad(h)}<span className="text-primary">:</span>{pad(m)}<span className="text-primary">:</span>{pad(s)}
            </div>
            {completedToday ? (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 w-fit">
                <Star size={16} className="text-green-400 fill-green-400" />
                <span className="text-green-300 text-sm font-bold">Challenge completed today!</span>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Pick a mode below to start today's challenge</p>
            )}
          </Block>

          {/* Stats card */}
          <Block
            className="col-span-12 md:col-span-5 bg-card border border-border"
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Flame size={15} className="text-orange-500" /> Best Streak
                </span>
                <span className="font-bold text-foreground">{stats.bestStreak} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap size={15} className="text-amber-500" /> Total XP
                </span>
                <span className="font-bold text-foreground">{stats.totalXp.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Trophy size={15} className="text-primary" /> Challenges Done
                </span>
                <span className="font-bold text-foreground">{stats.challengesDone}</span>
              </div>
            </div>
          </Block>

          {/* Challenge mode cards */}
          {challengeModes.map((mode, i) => {
            const Icon = mode.icon
            return (
              <Block
                key={mode.id}
                className="col-span-12 md:col-span-4 cursor-pointer group"
                transition={{ duration: 0.4, delay: 0.15 + i * 0.05, ease: 'easeOut' }}
                onClick={() => handleStart(mode.id)}
              >
                <div className={cn('rounded-xl bg-gradient-to-br p-4 mb-3', mode.gradient)}>
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{mode.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{mode.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap size={12} className="text-amber-500" />{mode.xp} XP</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{mode.time}</span>
                  </div>
                  <ChevronRight size={16} className={cn('text-muted-foreground transition-transform', !completedToday && 'group-hover:translate-x-1')} />
                </div>
                {completedToday && (
                  <div className="mt-2 text-xs text-muted-foreground/60 font-medium">Come back tomorrow</div>
                )}
              </Block>
            )
          })}

          {/* Weekly streak calendar */}
          <Block
            className="col-span-12 md:col-span-8 bg-card border border-border"
            transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">This Week</h3>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(({ label, key, isToday }) => {
                const done = completedDays[key]
                return (
                  <div key={key} className="flex flex-col items-center gap-1.5">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', isToday ? 'text-primary' : 'text-muted-foreground')}>
                      {label}
                    </span>
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors',
                      done
                        ? 'bg-primary text-white'
                        : isToday
                        ? 'border-2 border-primary/60 text-primary bg-primary/5'
                        : 'bg-muted/50 text-muted-foreground'
                    )}>
                      {done ? <Flame size={16} className="fill-white" /> : isToday ? '•' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </Block>

          {/* Leaderboard teaser */}
          <Block
            className="col-span-12 md:col-span-4 bg-card border border-border relative overflow-hidden"
            transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
          >
            {/* Blur overlay */}
            <div className="absolute inset-0 bg-card/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 rounded-2xl">
              <Lock size={20} className="text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground">Leaderboard coming soon</span>
            </div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Top Players</h3>
            {['Ana G.', 'Carlos M.', 'Lena K.', 'You'].map((name, i) => (
              <div key={name} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">#{i + 1} {name}</span>
                <span className="text-xs font-bold text-primary">{[980, 870, 760, 640][i]} XP</span>
              </div>
            ))}
          </Block>

        </div>
      </div>
    </div>
  )
}
