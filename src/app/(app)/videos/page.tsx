'use client'

import { motion, type MotionProps } from 'framer-motion'
import {
  Play, Film, Music, Mic, Tv, Globe, Clock,
  Star, Eye, Flame, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

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

// ── Data ───────────────────────────────────────────────────────────────────────
type Category = {
  icon: LucideIcon
  title: string
  description: string
  tag: string
  gradient: string
  border: string
  span: string
  count: string
}

const CATEGORIES: Category[] = [
  {
    icon: Globe,
    title: 'Culture & Travel',
    description: 'Vlogs and stories from Spanish-speaking countries',
    tag: 'Immersion',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
    border: 'border-sky-500/20',
    span: 'col-span-6 md:col-span-4',
    count: '12 videos',
  },
  {
    icon: Film,
    title: 'Grammar in Action',
    description: 'See real grammar rules used in natural conversations',
    tag: 'Grammar',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    border: 'border-amber-500/20',
    span: 'col-span-6 md:col-span-4',
    count: '8 videos',
  },
  {
    icon: Music,
    title: 'Music & Lyrics',
    description: 'Learn vocabulary and rhythm through songs',
    tag: 'Fun',
    gradient: 'linear-gradient(135deg, #831843 0%, #e11d48 100%)',
    border: 'border-rose-500/20',
    span: 'col-span-12 md:col-span-4',
    count: '20 videos',
  },
  {
    icon: Mic,
    title: 'Pronunciation',
    description: 'Sound like a native — phonetics, accents, and intonation',
    tag: 'Speaking',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    border: 'border-emerald-500/20',
    span: 'col-span-12 md:col-span-6',
    count: '6 videos',
  },
  {
    icon: Tv,
    title: 'TV & Film Clips',
    description: 'Short clips from shows and films with subtitles',
    tag: 'Entertainment',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    border: 'border-violet-500/20',
    span: 'col-span-12 md:col-span-6',
    count: '15 videos',
  },
]

const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const lift  = { scale: 1.02, filter: 'brightness(1.06)' } as const

// ── Page ───────────────────────────────────────────────────────────────────────
export default function VideosPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Videos" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Featured Video — hero ─────────────────────────────────────────── */}
          <Block
            whileHover={lift}
            className="col-span-12 md:col-span-8 relative overflow-hidden cursor-pointer min-h-[220px] border-indigo-500/20"
            style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)' }}
          >
            {/* Grain */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />
            {/* Film watermark */}
            <div className="absolute right-6 bottom-4 pointer-events-none select-none">
              <Film size={120} className="text-white/[0.05]" />
            </div>

            <div className="relative p-6 md:p-8 flex flex-col gap-4 h-full">
              {/* Label + tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
                  <span className="size-1.5 rounded-full bg-indigo-300 animate-pulse" />
                  Featured Video
                </span>
                <div className="ml-auto flex gap-1.5">
                  <span className="text-[10px] font-bold bg-white/15 border border-white/10 text-white px-2.5 py-0.5 rounded-full">Spanish</span>
                  <span className="text-[10px] font-bold bg-white/15 border border-white/10 text-white px-2.5 py-0.5 rounded-full">Beginner</span>
                </div>
              </div>

              {/* Title */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
                  5-Minute Spanish Stories
                </h2>
                <p className="text-sm text-white/55 leading-relaxed">
                  Real conversations, real accents — follow along with subtitles and learn how native speakers actually talk.
                </p>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[11px] text-white/45 font-semibold">
                  <Clock size={11} />
                  5:24 min
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-white/45 font-semibold">
                  <Eye size={11} />
                  2.4k views
                </span>
                <div className="ml-auto">
                  <button className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/15 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    <Play size={14} className="fill-white" />
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </Block>

          {/* ── Watch Stats ───────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 p-5 flex flex-col gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Watch Stats</p>

            <div className="flex flex-col gap-3 flex-1 justify-center">
              {(
                [
                  { label: 'Videos Watched', value: '0', Icon: Play },
                  { label: 'Minutes Learned', value: '0', Icon: Clock },
                  { label: 'Day Streak', value: '0', Icon: Flame },
                ] as const
              ).map(({ label, value, Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{label}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                Videos launching soon 🎬
              </p>
            </div>
          </Block>

          {/* ── Category tiles ────────────────────────────────────────────────── */}
          {CATEGORIES.map(({ icon: Icon, title, description, tag, gradient, border, span, count }, i) => (
            <Block
              key={title}
              whileHover={i % 2 === 0 ? tiltL : tiltR}
              className={cn('relative overflow-hidden cursor-pointer min-h-[165px] flex flex-col', span, border)}
              style={{ background: gradient }}
            >
              {/* Video count — top right */}
              <div className="absolute top-3.5 right-3.5">
                <span className="text-[9px] font-bold text-white/45 tabular-nums">{count}</span>
              </div>

              <div className="flex flex-col gap-2.5 p-4 h-full">
                {/* Tag */}
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/45 pr-12">
                  {tag}
                </span>

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
                <span className="inline-flex items-center gap-1 w-fit text-[9px] font-bold uppercase tracking-wider bg-white/10 border border-white/12 text-white/60 px-2 py-0.5 rounded-full">
                  <Star size={7} className="text-yellow-300/70" />
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
