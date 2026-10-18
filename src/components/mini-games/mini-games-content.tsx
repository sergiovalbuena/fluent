'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  BookOpen, BookType, Ear, Eye, Gem, Lightbulb, Sparkles, Headphones, Keyboard, LayoutGrid, Mic, Music, PenLine, Shuffle, Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { SourcePicker } from '@/components/mini-games/source-picker'

// ── Games ─────────────────────────────────────────────────────────────────────
// size: tall 4×2 · wide 8×1 · half 6×1 · third 4×1 · small 3×1 (cols × rows on desktop)
type Size = 'tall' | 'wide' | 'half' | 'third' | 'small'
type Game = { id: GameId; icon: LucideIcon; href: string; size: Size; gradient: string; difficulty: 1 | 2 | 3; phoneFull?: boolean }
type GameId =
  | 'vocabulary' | 'speedround' | 'verbs' | 'listening' | 'wordscramble' | 'flashcards' | 'musictime' | 'monkeytype'
  | 'filltheblank' | 'dictation' | 'matching' | 'typex3' | 'shortstory'

// Ordered to pack the 12-column grid (see the layout note above SIZE_CLASS)
const GAMES: Game[] = [
  { id: 'vocabulary', icon: Sparkles, href: '/mini-games/vocabulary', size: 'wide', difficulty: 1, gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #a855f7 100%)' },
  { id: 'speedround', icon: Zap, href: '/mini-games/speedround', size: 'wide', difficulty: 3, gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 55%, #ea580c 100%)' },
  { id: 'verbs', icon: BookType, href: '/verbs/practice', size: 'tall', difficulty: 2, gradient: 'linear-gradient(160deg, #ff8052 0%, #e11d48 100%)' },
  { id: 'monkeytype', icon: Keyboard, href: '/mini-games/monkeytype', size: 'wide', difficulty: 3, gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' },
  { id: 'wordscramble', icon: Shuffle, href: '/mini-games/wordscramble', size: 'third', difficulty: 2, gradient: 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)' },
  { id: 'typex3', icon: PenLine, href: '/mini-games/typex3', size: 'third', difficulty: 2, gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)' },
  { id: 'listening', icon: Headphones, href: '/mini-games/listening', size: 'half', difficulty: 2, gradient: 'linear-gradient(135deg, #7c3aed 0%, #a21caf 100%)' },
  { id: 'flashcards', icon: BookOpen, href: '/mini-games/flashcards', size: 'half', difficulty: 1, gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  { id: 'musictime', icon: Music, href: '/mini-games/musictime', size: 'tall', difficulty: 2, gradient: 'linear-gradient(160deg, #c026d3 0%, #6d28d9 100%)' },
  { id: 'filltheblank', icon: PenLine, href: '/mini-games/filltheblank', size: 'third', difficulty: 1, gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' },
  { id: 'dictation', icon: Mic, href: '/mini-games/dictation', size: 'third', difficulty: 3, gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)' },
  { id: 'matching', icon: LayoutGrid, href: '/mini-games/matching', size: 'third', difficulty: 2, gradient: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)' },
  { id: 'shortstory', icon: BookOpen, href: '/mini-games/shortstory', size: 'third', difficulty: 2, gradient: 'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)' },
]

// Desktop rows: intro 4×2 + vocabulary 8 / speed 8 · verbs 4×2 + monkeytype 8 /
// scramble 4 + type×3 4 · listening 6 + flashcards 6 · music 4×2 + fill, dictation /
// matching, story
const SIZE_CLASS: Record<Size, string> = {
  tall: 'col-span-6 md:col-span-4 row-span-2',
  wide: 'col-span-12 md:col-span-8',
  half: 'col-span-12 sm:col-span-6',
  third: 'col-span-6 md:col-span-4',
  small: 'col-span-6 md:col-span-3',
}

// ── Motion ────────────────────────────────────────────────────────────────────
// The card enters with the page stagger ("animate") and switches to "hover";
// the illustrations inside listen to the same labels.
const card: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  hover: { y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } },
}
const spring = { type: 'spring', stiffness: 380, damping: 20 } as const

// ── Page ──────────────────────────────────────────────────────────────────────
export function MiniGamesContent({ stats }: { stats: { gemsFromGames: number; gamesToday: number } | null }) {
  const t = useTranslations('mini_games')

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.04 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 auto-rows-[150px] md:auto-rows-[160px] gap-3 md:gap-4"
        >
          {/* Intro */}
          <motion.div
            variants={card}
            className="col-span-12 md:col-span-4 md:row-span-2 flex flex-col justify-between gap-4 rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
          >
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{t('heading')}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
            </div>
            <div>
              <SourcePicker className="w-full" />
              <p className="mt-1.5 px-1 text-[11px] text-slate-400">{t('source_hint')}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><Zap size={11} /> {t('reward_xp')}</span>
              <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-600 dark:text-sky-400"><Gem size={11} /> {t('reward_gems')}</span>
              {stats && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                  {t('stats', { gems: stats.gemsFromGames, today: stats.gamesToday })}
                </span>
              )}
            </div>
          </motion.div>

          {GAMES.map(game => <GameCard key={game.id} game={game} />)}
        </motion.div>
      </main>
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const t = useTranslations('mini_games')
  const Icon = game.icon
  const big = game.size === 'tall'

  return (
    <Link
      href={game.href}
      className={cn('group rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-primary/40', SIZE_CLASS[game.size], game.phoneFull && 'max-md:col-span-12')}
    >
      <motion.div
        variants={card}
        whileHover="hover"
        whileTap={{ scale: 0.98 }}
        className="relative h-full overflow-hidden rounded-3xl text-white shadow-[0_6px_20px_rgba(0,0,0,0.10)]"
        style={{ background: game.gradient }}
      >
        {/* Illustration: right side or top half, depending on the shape */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute',
            game.size === 'tall' && 'inset-x-0 top-0 h-[58%]',
            (game.size === 'wide' || game.size === 'half') && 'inset-y-0 right-0 w-[48%]',
            game.size === 'third' && 'right-0 top-0 h-[62%] w-[60%] md:h-full md:w-[52%]',
            game.size === 'small' && 'right-0 top-0 h-[62%] w-[60%]',
          )}
        >
          <Illustration id={game.id} />
        </div>

        <div className={cn('relative flex h-full flex-col justify-between', big ? 'p-6' : 'p-4')}>
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm', big ? 'size-10' : 'size-8')}>
              <Icon size={big ? 20 : 16} />
            </span>
            <span className="flex gap-0.5" title={t('difficulty')}>
              {[1, 2, 3].map(d => (
                <span key={d} className={cn('size-1.5 rounded-full', d <= game.difficulty ? 'bg-white/80' : 'bg-white/25')} />
              ))}
            </span>
          </div>
          <div className={cn(game.size === 'third' ? 'md:max-w-[55%]' : game.size === 'small' || game.size === 'tall' ? 'max-w-none' : 'max-w-[60%]')}>
            <p className={cn('font-bold leading-tight', big ? 'text-xl' : 'text-base')}>
              {t(`${game.id}_title`)}
            </p>
            <p className={cn('mt-1 leading-snug text-white/70', big ? 'text-sm' : 'text-xs line-clamp-2')}>{t(`${game.id}_desc`)}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Illustrations (animate on card hover) ─────────────────────────────────────

function Illustration({ id }: { id: GameId }) {
  switch (id) {
    case 'vocabulary': return <VocabIllustration />
    case 'speedround': return <SpeedIllustration />
    case 'verbs': return <VerbsIllustration />
    case 'listening': return <WaveIllustration bars={18} />
    case 'wordscramble': return <ScrambleIllustration />
    case 'flashcards': return <FlipIllustration front="chat" back="gato" />
    case 'musictime': return <VinylIllustration />
    case 'monkeytype': return <KeysIllustration />
    case 'filltheblank': return <BlankIllustration />
    case 'dictation': return <MicIllustration />
    case 'matching': return <MatchIllustration />
    case 'typex3': return <TypeX3Illustration />
    case 'shortstory': return <BookIllustration />
  }
}

const Center = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex h-full w-full items-center justify-center', className)}>{children}</div>
)

function VocabIllustration() {
  const stages = [Lightbulb, Eye, Ear, Keyboard]
  return (
    <Center className="gap-3 pr-4 [perspective:700px]">
      <motion.div
        className="relative h-20 w-36 [transform-style:preserve-3d] sm:h-24 sm:w-40"
        variants={{ animate: { rotateY: 0 }, hover: { rotateY: 180, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
      >
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white text-indigo-700 shadow-2xl [backface-visibility:hidden]">
          <span className="text-3xl">🍎</span>
          <span className="text-base font-bold">la pomme</span>
        </span>
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-indigo-100 text-indigo-800 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-3xl">🍎</span>
          <span className="text-base font-bold">la manzana</span>
        </span>
      </motion.div>
      <div className="hidden flex-col gap-1.5 lg:flex">
        {stages.map((Icon, i) => (
          <motion.span
            key={i}
            className="flex size-7 items-center justify-center rounded-lg bg-white/15"
            variants={{ animate: { scale: 1, backgroundColor: 'rgba(255,255,255,0.15)' }, hover: { scale: [1, 1.2, 1], backgroundColor: 'rgba(255,255,255,0.35)', transition: { duration: 0.4, delay: 0.15 + i * 0.12 } } }}
          >
            <Icon size={13} />
          </motion.span>
        ))}
      </div>
    </Center>
  )
}

function SpeedIllustration() {
  const words = ['bonjour', 'merci', 'maison', 'chat']
  return (
    <Center>
      <div className="relative size-24 sm:size-28">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
            strokeDasharray="276"
            variants={{ animate: { strokeDashoffset: 90 }, hover: { strokeDashoffset: 250, transition: { duration: 0.9, ease: 'easeOut' } } }}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          variants={{ animate: { rotate: 0, scale: 1 }, hover: { rotate: [0, -12, 10, -6, 0], scale: 1.15, transition: { duration: 0.5 } } }}
        >
          <Zap className="size-9 fill-white text-white drop-shadow-lg sm:size-11" />
        </motion.div>
        {words.map((w, i) => (
          <motion.span
            key={w}
            className="absolute hidden rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur-sm sm:block"
            style={{ top: `${[4, 20, 70, 86][i]}%`, left: `${[-18, 78, -24, 70][i]}%` }}
            variants={{
              animate: { x: 0, opacity: 0.85 },
              hover: { x: i % 2 ? 14 : -14, opacity: 1, transition: { ...spring, delay: i * 0.05 } },
            }}
          >
            {w}
          </motion.span>
        ))}
      </div>
    </Center>
  )
}

function VerbsIllustration() {
  const rows = ['je suis', 'tu es', 'il est', 'nous sommes']
  return (
    <Center className="flex-col gap-1.5 pt-14 md:pt-6">
      {rows.map((r, i) => (
        <motion.span
          key={r}
          className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur-sm"
          variants={{
            animate: { x: 0, rotate: 0 },
            hover: { x: (i - 1.5) * 10, rotate: (i - 1.5) * 3, transition: { ...spring, delay: i * 0.04 } },
          }}
        >
          {r}
        </motion.span>
      ))}
    </Center>
  )
}

function WaveIllustration({ bars }: { bars: number }) {
  return (
    <Center className="gap-1 pr-6">
      {Array.from({ length: bars }, (_, i) => {
        const base = 18 + ((i * 37) % 40)
        return (
          <motion.span
            key={i}
            style={{ height: base * 0.6 }}
            className="block w-1.5 rounded-full bg-white/70"
            variants={{
              animate: { height: base * 0.6 },
              hover: { height: [base * 0.6, base * 1.4, base * 0.4, base], transition: { duration: 0.9, repeat: Infinity, repeatType: 'mirror', delay: i * 0.04 } },
            }}
          />
        )
      })}
    </Center>
  )
}

function ScrambleIllustration() {
  const letters = ['C', 'H', 'A', 'T']
  const shuffled = [2, 0, 3, 1]
  return (
    <Center className="gap-1 pr-3">
      {letters.map((l, i) => (
        <motion.span
          key={l}
          className="flex size-7 items-center justify-center rounded-lg bg-white/90 text-sm font-black text-indigo-700 shadow"
          variants={{
            animate: { x: (shuffled[i] - i) * 32, rotate: (i % 2 ? 1 : -1) * 10 },
            hover: { x: 0, rotate: 0, transition: { ...spring, delay: i * 0.05 } },
          }}
        >
          {l}
        </motion.span>
      ))}
    </Center>
  )
}

function FlipIllustration({ front, back }: { front: string; back: string }) {
  return (
    <Center className="pr-3 [perspective:600px]">
      <motion.div
        className="relative h-16 w-24 [transform-style:preserve-3d]"
        variants={{ animate: { rotateY: 0 }, hover: { rotateY: 180, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
      >
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white text-sm font-bold text-amber-700 shadow-lg [backface-visibility:hidden]">{front}</span>
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-800 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">{back}</span>
      </motion.div>
    </Center>
  )
}

function VinylIllustration() {
  return (
    <Center className="pt-4">
      <div className="relative">
        <motion.div
          className="size-32 rounded-full shadow-2xl"
          style={{ background: 'repeating-radial-gradient(circle, #111 0 2px, #222 2px 4px)' }}
          variants={{ animate: { rotate: 0 }, hover: { rotate: 360, transition: { duration: 2, repeat: Infinity, ease: 'linear' } } }}
        >
          <span className="absolute inset-[38%] rounded-full bg-fuchsia-400 ring-4 ring-fuchsia-300/40" />
          <span className="absolute left-[30%] top-[18%] h-2 w-6 rounded-full bg-white/20 blur-[1px]" />
        </motion.div>
        {['♪', '♫', '♪'].map((n, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl font-bold"
            style={{ left: `${[100, 80, 110][i]}%`, top: `${[10, -10, 50][i]}%` }}
            variants={{
              animate: { y: 0, opacity: 0 },
              hover: { y: [-0, -30], opacity: [0, 1, 0], transition: { duration: 1.4, repeat: Infinity, delay: i * 0.4 } },
            }}
          >
            {n}
          </motion.span>
        ))}
      </div>
    </Center>
  )
}

function KeysIllustration() {
  const keys = ['b', 'o', 'n', 'j', 'o', 'u', 'r']
  return (
    <Center className="gap-1.5 pr-6">
      {keys.map((k, i) => (
        <motion.span
          key={i}
          className="flex size-9 items-center justify-center rounded-lg border-b-4 border-lime-700 bg-lime-400 text-sm font-black text-lime-950"
          variants={{
            animate: { y: 0, borderBottomWidth: 4 },
            hover: { y: [0, 3, 0], borderBottomWidth: [4, 1, 4], transition: { duration: 0.25, delay: i * 0.09, repeat: Infinity, repeatDelay: keys.length * 0.09 } },
          }}
        >
          {k}
        </motion.span>
      ))}
    </Center>
  )
}

function BlankIllustration() {
  return (
    <Center className="pr-3">
      <span className="flex items-baseline gap-1.5 text-sm font-bold">
        <span className="text-white/70">je</span>
        <span className="relative inline-flex min-w-14 justify-center border-b-2 border-dashed border-white/70 pb-0.5">
          <motion.span variants={{ animate: { opacity: 0, y: -8 }, hover: { opacity: 1, y: 0, transition: spring } }}>
            parle
          </motion.span>
        </span>
      </span>
    </Center>
  )
}

function MicIllustration() {
  return (
    <Center className="pr-3">
      <div className="relative flex size-14 items-center justify-center">
        {[0, 1].map(i => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-white/60"
            variants={{
              animate: { scale: 1, opacity: 0 },
              hover: { scale: [1, 1.9], opacity: [0.8, 0], transition: { duration: 1.2, repeat: Infinity, delay: i * 0.6 } },
            }}
          />
        ))}
        <motion.span
          className="flex size-14 items-center justify-center rounded-full bg-white text-rose-600 shadow-lg"
          variants={{ animate: { scale: 1 }, hover: { scale: 1.08, transition: spring } }}
        >
          <Mic size={24} />
        </motion.span>
      </div>
    </Center>
  )
}

function MatchIllustration() {
  return (
    <Center className="gap-2 pr-3 [perspective:600px]">
      {['eau', 'agua'].map((w, i) => (
        <motion.span
          key={w}
          className="flex h-14 w-11 items-center justify-center rounded-lg bg-white/90 text-[11px] font-bold text-cyan-800 shadow"
          variants={{
            animate: { rotateY: 180, y: 0 },
            hover: { rotateY: 0, y: [0, -6, 0], transition: { duration: 0.5, delay: i * 0.12 } },
          }}
        >
          {w}
        </motion.span>
      ))}
    </Center>
  )
}

function TypeX3Illustration() {
  return (
    <Center className="pr-3">
      <div className="relative h-16 w-24">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="absolute left-0 right-0 rounded-lg bg-white/90 py-1 text-center text-xs font-bold text-sky-800 shadow"
            style={{ top: 18, zIndex: 3 - i }}
            variants={{ animate: { y: i * 4, opacity: 1 - i * 0.25 }, hover: { y: (i - 1) * 20, opacity: 1, transition: { ...spring, delay: i * 0.05 } } }}
          >
            merci
          </motion.span>
        ))}
      </div>
    </Center>
  )
}

function BookIllustration() {
  return (
    <Center className="pr-3 [perspective:700px]">
      <div className="relative h-20 w-28">
        <span className="absolute inset-y-0 left-1/2 w-1/2 rounded-r-lg bg-orange-50 shadow-lg" />
        <span className="absolute inset-y-0 left-0 w-1/2 rounded-l-lg bg-orange-100 shadow-lg" />
        <motion.span
          className="absolute inset-y-0 left-1/2 w-1/2 origin-left rounded-r-lg bg-white shadow"
          variants={{ animate: { rotateY: 0 }, hover: { rotateY: -170, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
        >
          <span className="mx-3 mt-4 block h-1 rounded bg-orange-200" />
          <span className="mx-3 mt-2 block h-1 rounded bg-orange-200" />
          <span className="mx-3 mt-2 block h-1 w-2/3 rounded bg-orange-200" />
        </motion.span>
      </div>
    </Center>
  )
}
