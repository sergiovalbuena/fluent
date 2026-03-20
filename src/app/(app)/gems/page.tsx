'use client'

import { motion, type MotionProps } from 'framer-motion'
import {
  Gem, BookMarked, Lightbulb, Languages, AlertCircle, Smile,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Block primitive (mirrors dashboard) ───────────────────────────────────────
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

// ── Data ──────────────────────────────────────────────────────────────────────
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

// ── Hover presets ─────────────────────────────────────────────────────────────
const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const lift  = { scale: 1.02, filter: 'brightness(1.06)' } as const

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GemsPage() {
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

          {/* ── Gem of the Day — hero ────────────────────────────────────────── */}
          <Block
            whileHover={lift}
            className="col-span-12 md:col-span-8 border-amber-400/20 relative overflow-hidden min-h-[200px]"
            style={{ background: 'linear-gradient(160deg, #78350f 0%, #b45309 55%, #d97706 100%)' }}
          >
            {/* Grain texture */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />
            {/* Gem watermark */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none">
              <Gem size={110} className="text-white/[0.06]" />
            </div>

            <div className="relative p-6 md:p-8 flex flex-col gap-3 h-full">
              {/* Label + tags */}
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

              {/* Content */}
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

          {/* ── Gems Stats ───────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 p-5 flex flex-col gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Language Gems</p>

            <div className="flex-1 flex flex-col justify-center gap-1">
              <p className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">0</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">gems collected</p>

              <div className="mt-4 h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full w-0 bg-primary rounded-full" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">0 / 5 categories unlocked</p>
            </div>

            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                Bite-sized tips to level up your language 💎
              </p>
            </div>
          </Block>

          {/* ── Category tiles ───────────────────────────────────────────────── */}
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
                {/* Icon */}
                <div className="size-11 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Icon size={22} className="text-white" />
                </div>

                {/* Title + description */}
                <div className="mt-auto">
                  <p className="text-sm font-bold text-white leading-tight">{title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-snug">{description}</p>
                </div>

                {/* Coming soon pill */}
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
