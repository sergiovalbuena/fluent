'use client'

import Link from 'next/link'
import { motion, type MotionProps } from 'framer-motion'
import {
  Zap, Shuffle, Headphones, PenLine, Trophy,
  Star, Gamepad2, Target, Mic, Music, LayoutGrid, Grid3x3,
  Keyboard, BookOpen, Play,
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
type Game = {
  icon: LucideIcon
  title: string
  description: string
  gradient: string
  border: string
  difficulty: 1 | 2 | 3
  tag: string
  href: string
}

type ComingSoonGame = {
  icon: LucideIcon
  title: string
  description: string
  gradient: string
  tag: string
}

const ACTIVE_GAMES: Game[] = [
  {
    icon: Zap,
    title: 'Speed Round',
    description: 'Match words before time runs out',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    border: 'border-amber-400/20',
    difficulty: 3,
    tag: 'Fast & Furious',
    href: '/play/speedround',
  },
  {
    icon: Shuffle,
    title: 'Word Scramble',
    description: 'Unscramble letters to find the word',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)',
    border: 'border-blue-400/20',
    difficulty: 2,
    tag: 'Brain Teaser',
    href: '/play/wordscramble',
  },
  {
    icon: Headphones,
    title: 'Listening',
    description: 'Hear it, then pick the right answer',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a21caf 100%)',
    border: 'border-violet-400/20',
    difficulty: 2,
    tag: 'Ear Training',
    href: '/play/listening',
  },
  {
    icon: PenLine,
    title: 'Fill in the Blank',
    description: 'Complete the sentence correctly',
    gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    border: 'border-emerald-500/20',
    difficulty: 1,
    tag: 'Writing',
    href: '/play/filltheblank',
  },
  {
    icon: Mic,
    title: 'Dictation',
    description: 'Listen and type what you hear',
    gradient: 'linear-gradient(135deg, #9f1239 0%, #e11d48 100%)',
    border: 'border-rose-500/20',
    difficulty: 3,
    tag: 'Listen & Type',
    href: '/play/dictation',
  },
  {
    icon: Music,
    title: 'Music Time',
    description: 'Fill in the missing lyric word',
    gradient: 'linear-gradient(135deg, #7e22ce 0%, #c026d3 100%)',
    border: 'border-purple-500/20',
    difficulty: 2,
    tag: 'Lyrics',
    href: '/play/musictime',
  },
  {
    icon: LayoutGrid,
    title: 'Matching',
    description: 'Flip cards to pair words and translations',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #0d9488 100%)',
    border: 'border-cyan-500/20',
    difficulty: 2,
    tag: 'Memory',
    href: '/play/matching',
  },
  {
    icon: Grid3x3,
    title: 'Tic Tac Toe',
    description: 'Answer questions to earn your turn',
    gradient: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)',
    border: 'border-indigo-500/20',
    difficulty: 1,
    tag: 'Strategy',
    href: '/play/tictactoe',
  },
]

const COMING_SOON: ComingSoonGame[] = [
  { icon: Keyboard, title: 'MonkeyType',  description: 'Type Spanish words as fast as you can',   gradient: 'linear-gradient(135deg, #4d7c0f, #65a30d)', tag: 'Speed Typing' },
  { icon: BookOpen, title: 'FlashCards',  description: 'Flip through vocabulary flashcards',       gradient: 'linear-gradient(135deg, #b45309, #d97706)', tag: 'Vocabulary'   },
  { icon: BookOpen, title: 'Type × 3',    description: 'Reinforce words by typing them 3 times',   gradient: 'linear-gradient(135deg, #0369a1, #0284c7)', tag: 'Repetition'   },
  { icon: BookOpen, title: 'Short Story', description: 'Read a micro-story and answer questions',   gradient: 'linear-gradient(135deg, #9a3412, #c2410c)', tag: 'Reading'      },
  { icon: Play,     title: 'Short Video', description: 'Watch a clip and test your comprehension',  gradient: 'linear-gradient(135deg, #7f1d1d, #b91c1c)', tag: 'Watching'     },
]

// ── Hover presets ─────────────────────────────────────────────────────────────
const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const lift  = { scale: 1.02, filter: 'brightness(1.06)' } as const

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlayPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Play & Practice" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Daily Challenge — featured hero ─────────────────────────────── */}
          <Block
            whileHover={lift}
            className="col-span-12 md:col-span-8 border-emerald-500/20 relative overflow-hidden cursor-pointer min-h-[200px]"
            style={{ background: 'linear-gradient(160deg, #064e3b 0%, #059669 55%, #0d9488 100%)' }}
          >
            {/* Grain texture */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />
            {/* Trophy watermark */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none">
              <Trophy size={110} className="text-white/[0.05]" />
            </div>

            <div className="relative p-6 md:p-8 flex flex-col gap-4 h-full">
              {/* Label + XP badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
                  <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Daily Challenge
                </span>
                <span className="ml-auto text-[11px] font-bold bg-white/15 border border-white/10 text-white px-2.5 py-0.5 rounded-full">
                  +50 XP
                </span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                  Today's Challenge
                </h2>
                <p className="text-sm text-white/55 mt-1">
                  5 mini-games · Earn bonus XP · Resets daily
                </p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider">Progress</span>
                  <span className="text-[10px] font-bold text-white/65 tabular-nums">0 / 5</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-0 bg-white/40 rounded-full" />
                </div>
              </div>

              {/* CTA */}
              <div className="mt-auto pt-1">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                  Coming Soon
                  <Star size={13} className="text-yellow-300" />
                </button>
              </div>
            </div>
          </Block>

          {/* ── Game Stats ──────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 p-5 flex flex-col gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Game Stats</p>

            <div className="flex flex-col gap-3 flex-1 justify-center">
              {(
                [
                  { label: 'Total Game XP', value: '0', Icon: Star },
                  { label: 'Games Played', value: '0', Icon: Gamepad2 },
                  { label: 'Best Streak', value: '0', Icon: Target },
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
                Games launching soon ✨
              </p>
            </div>
          </Block>

          {/* ── Active game tiles ────────────────────────────────────────────── */}
          {ACTIVE_GAMES.map(({ icon: Icon, title, description, gradient, border, difficulty, tag, href }, i) => (
            <Link key={title} href={href} className="col-span-6 md:col-span-3">
              <Block
                whileHover={i % 2 === 0 ? tiltL : tiltR}
                className={cn(
                  'relative overflow-hidden cursor-pointer min-h-[170px] flex flex-col h-full',
                  border
                )}
                style={{ background: gradient }}
              >
                {/* Difficulty dots — top right */}
                <div className="absolute top-3.5 right-3.5 flex items-center gap-0.5">
                  {([1, 2, 3] as const).map(d => (
                    <div
                      key={d}
                      className={cn(
                        'size-1.5 rounded-full',
                        d <= difficulty ? 'bg-white/65' : 'bg-white/18'
                      )}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-2.5 p-4 h-full">
                  {/* Category tag */}
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/45 pr-10">
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
                </div>
              </Block>
            </Link>
          ))}

          {/* ── Coming Soon label ────────────────────────────────────────────── */}
          <motion.p
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
            }}
            className="col-span-12 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 pt-2"
          >
            Coming Soon
          </motion.p>

          {/* ── Coming Soon tiles ────────────────────────────────────────────── */}
          {COMING_SOON.map(({ icon: Icon, title, description, gradient, tag }) => (
            <div key={title} className="col-span-6 md:col-span-3 opacity-70">
              <Block
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden min-h-[170px] flex flex-col h-full border-white/10"
                style={{ background: gradient }}
              >
                {/* Soon badge — top right */}
                <div className="absolute top-3.5 right-3.5">
                  <span className="bg-white/20 text-white/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 p-4 h-full">
                  {/* Category tag */}
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
                </div>
              </Block>
            </div>
          ))}

        </motion.div>
      </main>
    </div>
  )
}
