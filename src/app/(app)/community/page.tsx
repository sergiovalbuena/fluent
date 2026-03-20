'use client'

import { motion, type MotionProps } from 'framer-motion'
import {
  MessageCircle, Users, Globe, Zap, Trophy,
  Heart, Star, TrendingUp, type LucideIcon,
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
type Tile = {
  icon: LucideIcon
  title: string
  description: string
  tag: string
  gradient: string
  border: string
  span: string
}

const TILES: Tile[] = [
  {
    icon: MessageCircle,
    title: 'Discussions',
    description: 'Ask questions, share tips, and connect with fellow learners',
    tag: 'Community',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
    border: 'border-sky-500/20',
    span: 'col-span-6 md:col-span-4',
  },
  {
    icon: Users,
    title: 'Study Partners',
    description: 'Find someone at your level to practice with daily',
    tag: 'Practice',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    border: 'border-emerald-500/20',
    span: 'col-span-6 md:col-span-4',
  },
  {
    icon: Globe,
    title: 'Language Exchange',
    description: 'Trade languages — teach yours, learn theirs',
    tag: 'Exchange',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    border: 'border-violet-500/20',
    span: 'col-span-12 md:col-span-4',
  },
  {
    icon: Zap,
    title: 'Weekly Challenge',
    description: 'Join the community challenge and earn bonus XP',
    tag: 'Challenge',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    border: 'border-amber-500/20',
    span: 'col-span-12 md:col-span-6',
  },
  {
    icon: Trophy,
    title: 'Leaderboard',
    description: 'Compete with learners worldwide and climb the ranks',
    tag: 'Competition',
    gradient: 'linear-gradient(135deg, #831843 0%, #e11d48 100%)',
    border: 'border-rose-500/20',
    span: 'col-span-12 md:col-span-6',
  },
]

const TRENDING = [
  { tag: 'Spanish', emoji: '🇪🇸', topic: 'Tips for memorizing ser vs estar?', replies: 24, hot: true },
  { tag: 'French', emoji: '🇫🇷', topic: 'Best podcasts for B1 French listening?', replies: 17, hot: false },
  { tag: 'General', emoji: '🌍', topic: 'How long to reach conversational fluency?', replies: 41, hot: true },
  { tag: 'Japanese', emoji: '🇯🇵', topic: 'Hiragana or romaji first — which is better?', replies: 12, hot: false },
]

const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const lift  = { scale: 1.02, filter: 'brightness(1.06)' } as const

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Community" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Featured Discussion — hero ────────────────────────────────────── */}
          <Block
            whileHover={lift}
            className="col-span-12 md:col-span-8 relative overflow-hidden cursor-pointer min-h-[220px] border-orange-600/20"
            style={{ background: 'linear-gradient(160deg, #7c2d12 0%, #c2410c 55%, #ea580c 100%)' }}
          >
            {/* Grain */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />
            {/* Watermark */}
            <div className="absolute right-5 bottom-4 pointer-events-none select-none">
              <Users size={120} className="text-white/[0.05]" />
            </div>

            <div className="relative p-6 md:p-8 flex flex-col gap-4 h-full">
              {/* Label */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
                  <Heart size={9} className="text-orange-300 fill-orange-300" />
                  Featured Discussion
                </span>
                <div className="ml-auto flex gap-1.5">
                  <span className="text-[10px] font-bold bg-white/15 border border-white/10 text-white px-2.5 py-0.5 rounded-full">🌍 All Languages</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
                  Share your first win! 🎉
                </h2>
                <p className="text-sm text-white/55 leading-relaxed">
                  What was the first moment you understood a native speaker without subtitles? Drop your story below — the community wants to hear it.
                </p>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[11px] text-white/45 font-semibold">
                  <MessageCircle size={11} />
                  128 replies
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-white/45 font-semibold">
                  <Heart size={11} />
                  346 likes
                </span>
                <div className="ml-auto">
                  <button className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/15 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    Join Discussion
                    <Star size={13} className="text-yellow-300" />
                  </button>
                </div>
              </div>
            </div>
          </Block>

          {/* ── Community Stats ───────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-4 p-5 flex flex-col gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Community</p>

            <div className="flex flex-col gap-3 flex-1 justify-center">
              {(
                [
                  { label: 'Members', value: '12.4k', Icon: Users },
                  { label: 'Posts Today', value: '0', Icon: MessageCircle },
                  { label: 'Active Now', value: '0', Icon: Zap },
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
                Community launching soon 🌍
              </p>
            </div>
          </Block>

          {/* ── Trending Topics — light block ─────────────────────────────────── */}
          <Block className="col-span-12 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trending Discussions</p>
            </div>

            <div className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {TRENDING.map(item => (
                <div
                  key={item.topic}
                  className="flex items-center gap-3 py-3 cursor-pointer group"
                >
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                      {item.topic}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{item.replies} replies</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.hot && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">
                        Hot 🔥
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          {/* ── Community tiles ────────────────────────────────────────────────── */}
          {TILES.map(({ icon: Icon, title, description, tag, gradient, border, span }, i) => (
            <Block
              key={title}
              whileHover={i % 2 === 0 ? tiltL : tiltR}
              className={cn('relative overflow-hidden cursor-pointer min-h-[165px] flex flex-col', span, border)}
              style={{ background: gradient }}
            >
              <div className="flex flex-col gap-2.5 p-4 h-full">
                {/* Tag */}
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">
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
