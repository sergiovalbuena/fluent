'use client'

import { useState, useEffect } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import {
  Gem, BookMarked, Lightbulb, Languages, AlertCircle, Smile,
  Zap, RotateCcw, Clock, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ── Block primitive ────────────────────────────────────────────────────────────
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

// ── Boost definitions ──────────────────────────────────────────────────────────
const BOOSTS = [
  {
    id: 'xp',
    icon: Zap,
    title: '2× XP',
    description: 'Double all XP earned for the next 10 minutes',
    cost: 30,
    durationMs: 10 * 60 * 1000,
    storageKey: 'fluent_boost_xp_expires',
    color: 'from-amber-500 to-yellow-500',
    border: 'border-amber-400/20',
  },
  {
    id: 'gems',
    icon: Gem,
    title: '2× Gems',
    description: 'Double all gems earned for the next 15 minutes',
    cost: 50,
    durationMs: 15 * 60 * 1000,
    storageKey: 'fluent_boost_gems_expires',
    color: 'from-emerald-500 to-teal-500',
    border: 'border-emerald-400/20',
  },
  {
    id: 'retry',
    icon: RotateCcw,
    title: 'Retry Free',
    description: 'Retry a lesson without losing your best score (1 use)',
    cost: 15,
    durationMs: 0, // uses-based
    storageKey: 'fluent_boost_retry_uses',
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-400/20',
  },
]

// ── Tip categories ─────────────────────────────────────────────────────────────
type Category = {
  icon: LucideIcon
  title: string
  description: string
  gradient: string
  border: string
  span: string
}

const CATEGORIES: Category[] = [
  {
    icon: Lightbulb,
    title: 'Grammar Tips',
    description: 'Quick, clear explanations of grammar rules without the textbook pain.',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    border: 'border-amber-400/20',
    span: 'col-span-6 md:col-span-4',
  },
  {
    icon: Languages,
    title: 'False Friends',
    description: 'Words that look similar in two languages but mean very different things.',
    gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
    border: 'border-rose-500/20',
    span: 'col-span-6 md:col-span-4',
  },
  {
    icon: Smile,
    title: 'Idioms & Slang',
    description: 'Sound natural with expressions locals actually use every day.',
    gradient: 'linear-gradient(135deg, #059669 0%, #16a34a 100%)',
    border: 'border-emerald-500/20',
    span: 'col-span-12 md:col-span-4',
  },
  {
    icon: AlertCircle,
    title: 'Common Mistakes',
    description: 'The errors most learners make — and how to avoid them.',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    border: 'border-orange-500/20',
    span: 'col-span-6 md:col-span-6',
  },
  {
    icon: BookMarked,
    title: 'Cultural Notes',
    description: 'Context and culture that helps you use the language appropriately.',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    border: 'border-violet-500/20',
    span: 'col-span-6 md:col-span-6',
  },
]

const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const lift  = { scale: 1.02, filter: 'brightness(1.06)' } as const

function pad(n: number) { return String(Math.floor(n)).padStart(2, '0') }

function useBoostCountdowns() {
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})

  useEffect(() => {
    const update = () => {
      const now = Date.now()
      const next: Record<string, number> = {}
      for (const b of BOOSTS) {
        if (b.durationMs === 0) continue
        const expires = Number(localStorage.getItem(b.storageKey) ?? 0)
        next[b.id] = Math.max(0, expires - now)
      }
      setCountdowns(next)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return countdowns
}

// ── Main component ─────────────────────────────────────────────────────────────
export function GemsPageContent({ totalGems: initialGems, userId }: { totalGems: number; userId: string | null }) {
  const [gems, setGems] = useState(initialGems)
  const [buying, setBuying] = useState<string | null>(null)
  const countdowns = useBoostCountdowns()

  async function handleBuyBoost(boost: typeof BOOSTS[number]) {
    if (!userId) { toast.error('Sign in to buy boosts'); return }
    if (gems < boost.cost) { toast.error(`Not enough gems! Need ${boost.cost} 💎`); return }
    if (boost.durationMs > 0 && (countdowns[boost.id] ?? 0) > 0) {
      toast.info('This boost is already active!')
      return
    }

    setBuying(boost.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({ total_gems: gems - boost.cost })
      .eq('user_id', userId)

    if (error) {
      toast.error('Failed to purchase boost')
      setBuying(null)
      return
    }

    setGems(g => g - boost.cost)

    if (boost.durationMs > 0) {
      localStorage.setItem(boost.storageKey, String(Date.now() + boost.durationMs))
    } else {
      // Uses-based: increment
      const current = Number(localStorage.getItem(boost.storageKey) ?? 0)
      localStorage.setItem(boost.storageKey, String(current + 1))
    }

    toast.success(`${boost.title} boost activated! 🚀`)
    setBuying(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Gems" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Gem of the Day — hero ─────────────────────────────────────── */}
          <Block
            whileHover={lift}
            className="col-span-12 md:col-span-8 border-amber-400/20 relative overflow-hidden min-h-[200px]"
            style={{ background: 'linear-gradient(160deg, #78350f 0%, #b45309 55%, #d97706 100%)' }}
          >
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none">
              <Gem size={110} className="text-white/[0.06]" />
            </div>
            <div className="relative p-6 md:p-8 flex flex-col gap-3 h-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
                  <Gem size={10} className="text-amber-300" />
                  Gem of the Day
                </span>
                <div className="ml-auto flex gap-1.5">
                  <span className="text-[10px] font-bold bg-white/15 border border-white/10 text-white px-2.5 py-0.5 rounded-full">Grammar</span>
                  <span className="text-[10px] font-bold bg-white/15 border border-white/10 text-white px-2.5 py-0.5 rounded-full">Spanish</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2">
                <p className="text-lg md:text-xl font-bold text-white leading-snug">
                  "Ser" vs "Estar" — both mean "to be" in Spanish, but they're not interchangeable.
                </p>
                <p className="text-sm text-white/55 leading-relaxed">
                  Use <strong className="text-white/80 font-bold">ser</strong> for permanent traits (origin, identity, characteristics).{' '}
                  Use <strong className="text-white/80 font-bold">estar</strong> for temporary states (feelings, location, conditions).
                </p>
              </div>
            </div>
          </Block>

          {/* ── Gems Balance ──────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 p-5 flex flex-col gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Balance</p>
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{gems}</p>
                <Gem size={22} className="text-amber-500 mb-0.5" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">gems available</p>
              <div className="mt-4 h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((gems / 200) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{gems} / 200 to next milestone</p>
            </div>
            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                Earn gems by completing lessons and mini-games 💎
              </p>
            </div>
          </Block>

          {/* ── Boost Shop ────────────────────────────────────────────────── */}
          <div className="col-span-12">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 mb-3">
              Boost Shop
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {BOOSTS.map((boost) => {
                const Icon = boost.icon
                const remaining = countdowns[boost.id] ?? 0
                const retryUses = typeof window !== 'undefined' ? Number(localStorage.getItem(boost.storageKey) ?? 0) : 0
                const isActive = boost.durationMs > 0 ? remaining > 0 : retryUses > 0
                const canAfford = gems >= boost.cost
                const mins = Math.floor(remaining / 60000)
                const secs = Math.floor((remaining % 60000) / 1000)

                return (
                  <motion.div
                    key={boost.id}
                    variants={{
                      initial: { scale: 0.5, y: 50, opacity: 0 },
                      animate: { scale: 1, y: 0, opacity: 1 },
                    }}
                    transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
                    className={cn(
                      'relative rounded-3xl border overflow-hidden',
                      isActive ? 'border-green-400/40' : boost.border
                    )}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', boost.color)} />
                    <div className="relative p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="size-11 rounded-2xl bg-white/20 flex items-center justify-center">
                          <Icon size={22} className="text-white" />
                        </div>
                        {isActive && (
                          <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 rounded-full px-2.5 py-1">
                            <CheckCircle2 size={12} className="text-green-300" />
                            <span className="text-[10px] font-bold text-green-200">ACTIVE</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white">{boost.title}</p>
                        <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{boost.description}</p>
                      </div>
                      {isActive && boost.durationMs > 0 && (
                        <div className="flex items-center gap-1.5 text-white/70 text-xs">
                          <Clock size={12} />
                          <span className="tabular-nums font-bold">{pad(mins)}:{pad(secs)} remaining</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleBuyBoost(boost)}
                        disabled={buying === boost.id || (isActive && boost.durationMs > 0)}
                        className={cn(
                          'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm transition-all',
                          (isActive && boost.durationMs > 0)
                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                            : canAfford
                            ? 'bg-white text-slate-900 hover:bg-white/90 active:scale-95'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                        )}
                      >
                        {buying === boost.id ? 'Activating…' : (
                          <>
                            <Gem size={14} className={canAfford ? 'text-amber-500' : 'text-white/40'} />
                            {boost.cost} gems
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* ── Tip Category tiles ────────────────────────────────────────── */}
          <div className="col-span-12">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 mb-3">
              Language Gems
            </p>
          </div>

          {CATEGORIES.map(({ icon: Icon, title, description, gradient, border, span }, i) => (
            <Block
              key={title}
              whileHover={i % 2 === 0 ? tiltL : tiltR}
              className={cn(
                'relative overflow-hidden cursor-pointer min-h-[160px] flex flex-col',
                span,
                border
              )}
              style={{ background: gradient }}
            >
              <div className="flex flex-col gap-2.5 p-4 h-full">
                <div className="size-11 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Icon size={22} className="text-white" />
                </div>
                <div className="mt-auto">
                  <p className="text-sm font-bold text-white leading-tight">{title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-snug">{description}</p>
                </div>
                <span className="inline-flex w-fit text-[9px] font-bold uppercase tracking-wider bg-white/10 border border-white/12 text-white/60 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </div>
            </Block>
          ))}

        </motion.div>
      </main>
    </div>
  )
}
