'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Lock, Star, Crown, Gem } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LearnModule = {
  id: string
  slug: string
  title: string
  icon: string
  progress: number          // lesson completion % (for progress ring)
  state: 'completed' | 'current' | 'available' | 'locked'
  totalLessons: number
  lessonsCompleted: number
  stars: 0 | 1 | 2 | 3
  hasCrown: boolean
  gemsEarned: number
}

type BonusActivity = {
  id: string
  bonusType: 'bonus'
  activityType: 'video' | 'story' | 'game' | 'task'
  title: string
  icon: string
  href: string
  gemsReward: number
  locked: boolean
}

type CrownChallenge = {
  id: string
  bonusType: 'crown'
  title: string
  href: string
  locked: boolean
}

type PathNode = LearnModule | BonusActivity | CrownChallenge

function isBonus(node: PathNode): node is BonusActivity {
  return 'bonusType' in node && (node as BonusActivity).bonusType === 'bonus'
}

function isCrownChallenge(node: PathNode): node is CrownChallenge {
  return 'bonusType' in node && (node as CrownChallenge).bonusType === 'crown'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_LABELS = [
  'A1 · Beginner',
  'A2 · Elementary',
  'B1 · Intermediate',
  'B2 · Upper-Intermediate',
  'C1 · Advanced',
  'C2 · Mastery',
]

const BONUS_POOL: Omit<BonusActivity, 'id' | 'locked'>[] = [
  { bonusType: 'bonus', activityType: 'video',  title: 'Mini Video',     icon: '📹', href: '/videos',            gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'story',  title: 'Mini Story',     icon: '📖', href: '/play/shortstory',   gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'game',   title: 'Speed Round',    icon: '⚡', href: '/play/speedround',   gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'task',   title: 'Flash Cards',    icon: '🃏', href: '/play/flashcards',   gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'game',   title: 'Word Scramble',  icon: '🔤', href: '/play/wordscramble', gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'video',  title: 'Short Video',    icon: '🎬', href: '/videos',            gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'game',   title: 'Monkey Type',    icon: '⌨️', href: '/play/monkeytype',   gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'story',  title: 'Short Story',    icon: '✍️', href: '/play/shortstory',   gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'game',   title: 'Fill the Blank', icon: '📝', href: '/play/filltheblank', gemsReward: 5 },
  { bonusType: 'bonus', activityType: 'task',   title: 'Matching',       icon: '🧩', href: '/play/matching',     gemsReward: 5 },
]

// Insert a bonus activity every 3–4 modules (alternating), plus a Crown Challenge every 3rd mini game
function generatePathNodes(modules: LearnModule[]): PathNode[] {
  const nodes: PathNode[] = []
  let bonusIdx = 0
  let gap = 3       // alternates 3 → 4 → 3 → 4 …
  let counter = 0

  for (let i = 0; i < modules.length; i++) {
    nodes.push(modules[i])
    counter++
    if (counter >= gap && i < modules.length - 1) {
      const locked = modules[i].state !== 'completed'
      nodes.push({ ...BONUS_POOL[bonusIdx % BONUS_POOL.length], id: `bonus-${bonusIdx}`, locked })
      bonusIdx++

      // Every 3rd mini game → Crown Challenge
      if (bonusIdx % 3 === 0) {
        nodes.push({ bonusType: 'crown' as const, id: `crown-${bonusIdx}`, title: 'Crown Challenge', href: '/play', locked })
      }

      gap = gap === 3 ? 4 : 3
      counter = 0
    }
  }
  return nodes
}

// ── Star row ──────────────────────────────────────────────────────────────────

function StarRow({
  stars,
  size = 10,
  className,
}: {
  stars: 0 | 1 | 2 | 3
  size?: number
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-px', className)}>
      {([1, 2, 3] as const).map(n => (
        <Star
          key={n}
          size={size}
          strokeWidth={stars >= n ? 0 : 1.5}
          className={stars >= n ? 'text-amber-400 fill-amber-400' : 'text-white/25 fill-transparent'}
        />
      ))}
    </div>
  )
}

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ progress, size = 68 }: { progress: number; size?: number }) {
  const r = (size - 7) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,128,82,0.2)" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#ff8052" strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (progress / 100) * circ }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

// ── Module tooltip (all states including locked) ───────────────────────────────

function ModuleTooltip({ mod }: { mod: LearnModule }) {
  const isLocked = mod.state === 'locked'

  return (
    <div className={cn(
      'absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50',
      'pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150',
      'bg-white dark:bg-[#2a1a12] rounded-2xl',
      'shadow-[0_8px_28px_rgba(0,0,0,0.12)] border border-black/[0.06] dark:border-white/[0.06]',
      'min-w-[148px]',
    )}>
      {isLocked ? (
        <div className="flex flex-col items-center gap-1.5 text-center px-4 py-3">
          <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Lock size={13} className="text-slate-400" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Locked</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-snug">
            Complete the previous<br />module to unlock
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-3 py-3">
          {/* Title */}
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{mod.icon}</span>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
              {mod.title}
            </p>
          </div>

          <div className="w-full h-px bg-black/[0.06] dark:bg-white/[0.06]" />

          {/* Lessons */}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {mod.state === 'available'
              ? `${mod.totalLessons} lessons · Ready to start`
              : `${mod.lessonsCompleted}/${mod.totalLessons} lessons`
            }
          </p>

          {/* Stars · Gems · Crown */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stars */}
            {mod.stars > 0
              ? <StarRow stars={mod.stars} size={11} />
              : <span className="text-[9px] text-slate-400 dark:text-slate-500">No stars yet</span>
            }

            {/* Gems */}
            {mod.gemsEarned > 0 && (
              <>
                <span className="text-slate-200 dark:text-slate-700 text-[10px]">·</span>
                <div className="flex items-center gap-0.5">
                  <Gem size={9} className="text-amber-500" />
                  <span className="text-[9px] font-bold text-amber-500 tabular-nums">{mod.gemsEarned}</span>
                </div>
              </>
            )}

            {/* Crown */}
            {mod.hasCrown && (
              <>
                <span className="text-slate-200 dark:text-slate-700 text-[10px]">·</span>
                <div className="flex items-center gap-0.5">
                  <Crown size={9} className="text-violet-500 fill-violet-500" />
                  <span className="text-[9px] font-bold text-violet-500">Mastered</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0
        border-l-[5px] border-r-[5px] border-t-[5px]
        border-l-transparent border-r-transparent
        border-t-white dark:border-t-[#2a1a12]" />
    </div>
  )
}

// ── Bonus tooltip ─────────────────────────────────────────────────────────────

function BonusTooltip({ activity }: { activity: BonusActivity }) {
  return (
    <div className={cn(
      'absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50',
      'pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150',
      'bg-white dark:bg-[#2a1a12] rounded-2xl px-3 py-3',
      'shadow-[0_8px_28px_rgba(0,0,0,0.12)] border border-amber-300/40 dark:border-amber-600/30',
      'min-w-[136px]',
    )}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{activity.icon}</span>
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{activity.title}</p>
        </div>
        <div className="w-full h-px bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
            Optional
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Gem size={9} className="text-amber-500" />
          <span className="text-[10px] font-bold text-amber-500">+{activity.gemsReward} gems on completion</span>
        </div>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0
        border-l-[5px] border-r-[5px] border-t-[5px]
        border-l-transparent border-r-transparent
        border-t-white dark:border-t-[#2a1a12]" />
    </div>
  )
}

// ── Module map node ───────────────────────────────────────────────────────────

const nodeVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1, scale: 1,
    transition: { duration: 0.55, ease: 'easeOut' as const },
  },
}

function MapNode({ mod }: { mod: LearnModule }) {
  const isCurrent = mod.state === 'current'
  const isDone    = mod.state === 'completed'
  const isLocked  = mod.state === 'locked'

  const node = (
    <motion.div
      variants={nodeVariants}
      className="group flex flex-col items-center gap-1.5 relative"
      whileHover={{ y: -3, zIndex: 50 }}
      transition={{ duration: 0.15 }}
    >
      {/* Tooltip — all states */}
      <ModuleTooltip mod={mod} />

      {/* Circle */}
      <div className="relative">
        {/* Ping bands for current — same animation as Crown */}
        {isCurrent && ([0, CROWN_LOOP * 0.25, CROWN_LOOP * 0.5, CROWN_LOOP * 0.75] as number[]).map((delay, i) => (
          <motion.span
            key={i}
            className="absolute z-0 rounded-[20px] border border-primary/50 bg-gradient-to-br from-primary/25 to-primary/5 shadow-lg shadow-primary/20"
            style={{
              width: 86, height: 86,
              left: '50%', top: '50%',
              translateX: '-50%', translateY: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.25 }}
            animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{
              repeat: Infinity, repeatType: 'loop',
              times: [0, 0.5, 0.75, 1],
              duration: CROWN_LOOP, ease: 'linear', delay,
            }}
          />
        ))}
        {isCurrent && <ProgressRing progress={mod.progress} size={68} />}

        {/* Crown badge */}
        {isDone && mod.hasCrown && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.9 }}
            className="absolute -top-2 -right-2 z-20 size-[18px] bg-violet-600 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(139,92,246,0.55)] border-2 border-white dark:border-[#1c0e09]"
          >
            <Crown size={9} className="text-white fill-white" />
          </motion.div>
        )}

        {/* Node circle */}
        <motion.div
          whileTap={!isLocked ? { scale: 0.9, y: 4 } : {}}
          transition={{ duration: 0.1 }}
          className={cn(
            'size-[52px] rounded-[18px] flex items-center justify-center text-2xl relative z-10 select-none',
            isDone    && 'bg-emerald-500 shadow-[0_5px_0_#15803d]',
            isCurrent && 'bg-primary shadow-[0_5px_0_#c4612e]',
            mod.state === 'available' &&
              'bg-white dark:bg-[#3a2218] border-2 border-slate-200 dark:border-white/10 shadow-[0_5px_0_rgba(0,0,0,0.09)] dark:shadow-[0_5px_0_rgba(0,0,0,0.45)]',
            isLocked &&
              'bg-slate-100 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-600 opacity-35 shadow-none',
          )}
        >
          {isLocked
            ? <Lock size={17} className="text-slate-400" />
            : <span className="leading-none">{mod.icon}</span>
          }
        </motion.div>
      </div>

      {/* Label chip */}
      <div className={cn(
        'rounded-lg px-2 py-1 text-center max-w-[76px]',
        isCurrent  && 'bg-primary shadow-[0_3px_0_#c4612e]',
        isDone     && 'bg-emerald-500 shadow-[0_3px_0_#15803d]',
        isLocked   && 'opacity-30',
        !isCurrent && !isDone && !isLocked &&
          'bg-white dark:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.07] shadow-[0_3px_0_rgba(0,0,0,0.06)] dark:shadow-[0_3px_0_rgba(0,0,0,0.3)]',
      )}>
        <p className={cn(
          'text-[11px] font-bold leading-tight line-clamp-2',
          (isCurrent || isDone) ? 'text-white'
            : isLocked ? 'text-slate-400'
            : 'text-slate-700 dark:text-slate-100',
        )}>
          {mod.title}
        </p>

        {isDone && (
          <div className="flex justify-center mt-1">
            <StarRow stars={mod.stars} size={8} />
          </div>
        )}

        {isCurrent && mod.totalLessons > 0 && (
          <p className="text-[10px] text-white/65 mt-0.5 font-medium tabular-nums">
            {mod.lessonsCompleted}/{mod.totalLessons}
          </p>
        )}
      </div>
    </motion.div>
  )

  if (isLocked) return node
  return <Link href={`/learn/${mod.slug}`} className="focus:outline-none">{node}</Link>
}

// ── Bonus activity node ───────────────────────────────────────────────────────

function BonusMapNode({ activity }: { activity: BonusActivity }) {
  const inner = (
    <motion.div
      variants={nodeVariants}
      className={cn(
        'group flex flex-col items-center gap-1.5 relative',
        activity.locked ? 'opacity-35 cursor-default' : '',
      )}
      whileHover={!activity.locked ? { y: -3, scale: 1.04, zIndex: 50 } : {}}
      transition={{ duration: 0.15 }}
    >
      {!activity.locked && <BonusTooltip activity={activity} />}

      {/* Gem reward badge */}
      {!activity.locked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.6 }}
          className="absolute -top-1.5 -right-0.5 z-20 flex items-center gap-0.5 bg-amber-400 rounded-full px-1.5 py-0.5 shadow-sm border border-amber-300 dark:border-amber-500"
        >
          <Gem size={7} className="text-white" />
          <span className="text-[7px] font-black text-white leading-none">+{activity.gemsReward}</span>
        </motion.div>
      )}

      {/* Node */}
      <motion.div
        whileTap={!activity.locked ? { scale: 0.9, y: 4 } : {}}
        transition={{ duration: 0.1 }}
        className={cn(
          'size-[44px] rounded-[16px] flex items-center justify-center text-xl relative z-10 select-none',
          activity.locked
            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-600/50'
            : 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-600/50 shadow-[0_4px_0_rgba(245,158,11,0.25)]',
        )}
      >
        {activity.locked
          ? <Lock size={15} className="text-amber-400 dark:text-amber-500/70" />
          : <span className="leading-none">{activity.icon}</span>
        }
      </motion.div>

      {/* Label */}
      <div className={cn(
        'rounded-lg px-2 py-1 text-center max-w-[72px]',
        activity.locked
          ? 'bg-amber-100/50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-600/50'
          : 'bg-amber-400 shadow-[0_3px_0_#d97706]',
      )}>
        <p className={cn(
          'text-[10px] font-black leading-tight line-clamp-1 uppercase tracking-wide',
          activity.locked ? 'text-amber-500/70 dark:text-amber-400/60' : 'text-white',
        )}>
          {activity.title}
        </p>
        <p className={cn('text-[9px] font-medium mt-px', activity.locked ? 'text-amber-400/50 dark:text-amber-500/40' : 'text-white/70')}>
          optional
        </p>
      </div>
    </motion.div>
  )

  if (activity.locked) return inner
  return <Link href={activity.href} className="focus:outline-none">{inner}</Link>
}

// ── Crown Challenge node ───────────────────────────────────────────────────────

const CROWN_LOOP = 4

function CrownChallengeTooltip({ challenge }: { challenge: CrownChallenge }) {
  return (
    <div className={cn(
      'absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50',
      'pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150',
      'bg-white dark:bg-[#2a1a12] rounded-2xl px-3 py-3',
      'shadow-[0_8px_28px_rgba(0,0,0,0.12)] border border-violet-300/40 dark:border-violet-600/30',
      'min-w-[148px]',
    )}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Crown size={14} className="text-violet-500 fill-violet-500" />
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{challenge.title}</p>
        </div>
        <div className="w-full h-px bg-black/[0.06] dark:bg-white/[0.06]" />
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Prove module mastery to earn a Crown
        </p>
        <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-md uppercase tracking-wide self-start">
          Optional
        </span>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0
        border-l-[5px] border-r-[5px] border-t-[5px]
        border-l-transparent border-r-transparent
        border-t-white dark:border-t-[#2a1a12]" />
    </div>
  )
}

function CrownChallengeNode({ challenge }: { challenge: CrownChallenge }) {
  const inner = (
    <motion.div
      variants={nodeVariants}
      className={cn(
        'group flex flex-col items-center gap-1.5 relative',
        challenge.locked ? 'opacity-35 cursor-default' : '',
      )}
      whileHover={!challenge.locked ? { y: -3, scale: 1.04, zIndex: 50 } : {}}
      transition={{ duration: 0.15 }}
    >
      {!challenge.locked && <CrownChallengeTooltip challenge={challenge} />}

      {/* Ping animation wrapper */}
      <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
        {/* Expanding bands — only when unlocked */}
        {!challenge.locked && ([0, CROWN_LOOP * 0.25, CROWN_LOOP * 0.5, CROWN_LOOP * 0.75] as number[]).map((delay, i) => (
          <motion.span
            key={i}
            className="absolute z-0 rounded-full border border-violet-500 bg-gradient-to-br from-violet-500/30 to-violet-800/10 shadow-lg shadow-violet-500/25"
            style={{
              width: 86, height: 86,
              left: '50%', top: '50%',
              translateX: '-50%', translateY: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.25 }}
            animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{
              repeat: Infinity, repeatType: 'loop',
              times: [0, 0.5, 0.75, 1],
              duration: CROWN_LOOP, ease: 'linear', delay,
            }}
          />
        ))}

        {/* Crown button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          whileTap={!challenge.locked ? { scale: 0.9, y: 4 } : {}}
          className={cn(
            'relative z-10 size-[52px] rounded-[18px] flex items-center justify-center select-none',
            challenge.locked
              ? 'bg-violet-50/40 dark:bg-violet-950/20 border-2 border-dashed border-violet-400 dark:border-violet-600/60'
              : 'bg-violet-600 shadow-[0_5px_0_#4c1d95]',
          )}
        >
          {challenge.locked
            ? <Lock size={17} className="text-violet-400 dark:text-violet-500/70" />
            : <Crown size={22} className="text-white fill-white" />
          }
        </motion.div>
      </div>

      {/* Label */}
      <div className={cn(
        'rounded-lg px-2 py-1 text-center max-w-[80px]',
        challenge.locked
          ? 'bg-violet-100/50 dark:bg-violet-950/20 border border-dashed border-violet-400 dark:border-violet-600/60'
          : 'bg-violet-600 shadow-[0_3px_0_#4c1d95]',
      )}>
        <p className={cn(
          'text-[10px] font-black leading-tight uppercase tracking-wide line-clamp-1',
          challenge.locked ? 'text-violet-500/70 dark:text-violet-400/60' : 'text-white',
        )}>
          Crown
        </p>
        <p className={cn('text-[9px] font-medium mt-px', challenge.locked ? 'text-violet-400/50 dark:text-violet-500/40' : 'text-white/70')}>
          optional
        </p>
      </div>
    </motion.div>
  )

  if (challenge.locked) return inner
  return <Link href={challenge.href} className="focus:outline-none">{inner}</Link>
}

// ── Connectors ────────────────────────────────────────────────────────────────

function Connector({ x, color = '#cbd5e1' }: { x: string; color?: string }) {
  return (
    <div className="relative w-full" style={{ height: 28 }}>
      <div
        className="absolute w-0.5"
        style={{
          left: x, top: 0, height: '100%',
          backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0px, ${color} 4px, transparent 4px, transparent 10px)`,
        }}
      />
    </div>
  )
}

function LConnector({ fromX, toX, color = '#cbd5e1' }: { fromX: string; toX: string; color?: string }) {
  const dash = `repeating-linear-gradient(var(--d), ${color} 0px, ${color} 4px, transparent 4px, transparent 10px)`
  if (fromX === toX) return <Connector x={fromX} color={color} />
  const goRight = parseFloat(toX) > parseFloat(fromX)

  return (
    <div className="relative w-full" style={{ height: 36 }}>
      <div className="absolute w-0.5" style={{
        left: fromX, top: 0, height: '40%',
        backgroundImage: dash.replace('var(--d)', 'to bottom'),
      }} />
      <div className="absolute h-0.5" style={{
        top: '40%',
        left: goRight ? fromX : toX,
        right: goRight ? `calc(100% - ${toX})` : `calc(100% - ${fromX})`,
        backgroundImage: dash.replace('var(--d)', 'to right'),
      }} />
      <div className="absolute w-0.5" style={{
        left: toX, bottom: 0, height: '60%',
        backgroundImage: dash.replace('var(--d)', 'to bottom'),
      }} />
    </div>
  )
}

// ── Path trail ────────────────────────────────────────────────────────────────

const COLS: Record<number, string[]> = {
  3: ['16.7%', '50%', '83.3%'],
  2: ['25%', '75%'],
}

const NODE_CENTER_Y = 26 // half of 52px node

const COMING_SOON: LearnModule[] = [
  { id: 'cs1', slug: '', title: 'Coming Soon', icon: '🔒', progress: 0, state: 'locked', totalLessons: 0, lessonsCompleted: 0, stars: 0, hasCrown: false, gemsEarned: 0 },
  { id: 'cs2', slug: '', title: 'Coming Soon', icon: '🔒', progress: 0, state: 'locked', totalLessons: 0, lessonsCompleted: 0, stars: 0, hasCrown: false, gemsEarned: 0 },
  { id: 'cs3', slug: '', title: 'Coming Soon', icon: '🔒', progress: 0, state: 'locked', totalLessons: 0, lessonsCompleted: 0, stars: 0, hasCrown: false, gemsEarned: 0 },
]

export function PathTrail({ modules }: { modules: LearnModule[] }) {
  const realNodes = generatePathNodes(modules)
  const allNodes: PathNode[] = [...realNodes, ...COMING_SOON]

  // Group into rows [3, 2, 3, 2, ...]
  const rows: PathNode[][] = []
  let idx = 0
  const sizes = [3, 2]
  while (idx < allNodes.length) {
    const size = sizes[rows.length % 2]
    rows.push(allNodes.slice(idx, idx + size))
    idx += size
  }

  // Track real module index per row (exclude bonus + coming soon) + compute chapter label
  let realModuleIdx = 0
  const rowMeta = rows.map((row) => {
    const startReal = realModuleIdx
    const realCount = row.filter(n => !isBonus(n) && !isCrownChallenge(n) && !n.id.startsWith('cs')).length
    realModuleIdx += realCount
    const chapterLabel = (() => {
      for (let k = 0; k < realCount; k++) {
        const abs = startReal + k
        if (abs % 10 === 0) return LEVEL_LABELS[Math.floor(abs / 10)] ?? `Level ${Math.floor(abs / 10) + 1}`
      }
      return undefined
    })()
    return { row, startReal, realCount, chapterLabel }
  })

  // Group rows into chapter sections so the sticky label spans only its chapter
  type RowData = typeof rowMeta[number] & { rowIdx: number }
  const sections: Array<{ label: string | undefined; rowsData: RowData[] }> = []
  rowMeta.forEach((meta, rowIdx) => {
    if (meta.chapterLabel !== undefined || sections.length === 0) {
      sections.push({ label: meta.chapterLabel, rowsData: [{ ...meta, rowIdx }] })
    } else {
      sections[sections.length - 1].rowsData.push({ ...meta, rowIdx })
    }
  })

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
      className="flex flex-col w-full"
    >
      {sections.map((section, sectionIdx) => (
        <div key={`section-${sectionIdx}`} className="relative">
          {/* Sticky chapter label — zero-height anchor that scrolls within its section */}
          {section.label && (
            <motion.div
              variants={{ hidden: { opacity: 0, x: 6 }, show: { opacity: 1, x: 0, transition: { duration: 0.4 } } }}
              className="sticky top-12 h-0 overflow-visible z-10 pointer-events-none"
            >
              <div className="absolute right-full pr-2">
                <div className="flex items-center justify-center bg-white dark:bg-white/[0.07] border border-black/[0.07] dark:border-white/[0.07] rounded-full px-1.5 py-2.5 shadow-sm">
                  <span
                    className="text-[7px] font-black uppercase text-slate-400 dark:text-slate-500 leading-none"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.12em' }}
                  >
                    {section.label}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rows */}
          {section.rowsData.map(({ row, rowIdx, chapterLabel: _label }) => {
            const isOdd       = rowIdx % 2 === 1
            const displayMods = isOdd ? [...row].reverse() : row
            const cols        = COLS[row.length] ?? COLS[2]

            const exitX = isOdd ? cols[0] : cols[cols.length - 1]

            const nextMeta  = rowMeta[rowIdx + 1]
            const nextIsOdd = (rowIdx + 1) % 2 === 1
            const nextCols  = nextMeta ? (COLS[nextMeta.row.length] ?? COLS[2]) : cols
            const entryX    = nextIsOdd ? nextCols[nextCols.length - 1] : nextCols[0]

            const allDone   = row.every(n => isBonus(n) || isCrownChallenge(n) || (n as LearnModule).state === 'completed')
            const connColor = allDone ? '#86efac' : '#cbd5e1'

            return (
              <motion.div key={`row-${rowIdx}`} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                <div className="relative">
                  {/* Horizontal dotted connectors */}
                  {cols.slice(0, -1).map((fromX, ci) => {
                    const toX = cols[ci + 1]
                    return (
                      <div
                        key={ci}
                        className="absolute"
                        style={{
                          top: NODE_CENTER_Y,
                          left: fromX,
                          right: `calc(100% - ${toX})`,
                          height: 2,
                          backgroundImage: `repeating-linear-gradient(to right, ${connColor} 0px, ${connColor} 4px, transparent 4px, transparent 10px)`,
                        }}
                      />
                    )
                  })}

                  <div
                    className="relative grid"
                    style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
                  >
                    {displayMods.map(node => (
                      <div key={node.id} className="flex justify-center">
                        {isCrownChallenge(node)
                          ? <CrownChallengeNode challenge={node} />
                          : isBonus(node)
                          ? <BonusMapNode activity={node} />
                          : <MapNode mod={node as LearnModule} />
                        }
                      </div>
                    ))}
                  </div>
                </div>

                {nextMeta && (
                  <LConnector fromX={exitX} toX={entryX} color={connColor} />
                )}
              </motion.div>
            )
          })}
        </div>
      ))}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export type Props = {
  modules: LearnModule[]
  languageName: string
  languageFlag: string
}

export function LearnContent({ modules, languageName, languageFlag }: Props) {
  const current        = modules.find(m => m.state === 'current') ?? modules[0] ?? null
  const completedCount = modules.filter(m => m.state === 'completed').length
  const totalModules   = modules.length
  const pathPct        = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0

  const starsEarned   = modules.reduce((sum, m) => sum + m.stars, 0)
  const starsPossible = totalModules * 3

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Learning Path" subtitle={`${languageFlag} ${languageName}`} />

      {/* Sticky progress strip */}
      <div className="sticky top-0 z-20 bg-[#f6f4f2]/85 dark:bg-[#1c0e09]/85 backdrop-blur-md border-b border-black/[0.05] dark:border-white/[0.04] px-4 py-2.5">
        <div className="max-w-sm mx-auto flex items-center gap-3">
          <span className="text-lg leading-none shrink-0">{languageFlag}</span>

          <div className="flex-1 h-2 bg-black/[0.07] dark:bg-white/[0.07] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pathPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-bold text-amber-500 tabular-nums">
              {starsEarned}<span className="text-amber-400/50">/{starsPossible}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Trail */}
      <main className="flex-1 px-4 pt-8 pb-36 md:pb-28">
        <div className="max-w-xs mx-auto">
          <PathTrail modules={modules} />
        </div>
      </main>

      {/* Floating CTA */}
      {current && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs px-4">
          <Link href={`/learn/${current.slug}`}>
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 320, damping: 28 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97, y: 4 }}
              className="flex items-center gap-3 bg-primary px-5 py-3.5 rounded-2xl shadow-[0_6px_0_#c4612e] cursor-pointer"
            >
              <span className="text-2xl leading-none shrink-0">{current.icon}</span>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-0.5">
                  {current.lessonsCompleted > 0 ? 'Continue' : 'Start'}
                </p>
                <p className="text-sm font-bold text-white truncate leading-tight">{current.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {current.stars > 0
                    ? <StarRow stars={current.stars} size={9} />
                    : current.totalLessons > 0 && (
                      <p className="text-[10px] text-white/55 font-medium">
                        {current.lessonsCompleted}/{current.totalLessons} lessons
                      </p>
                    )
                  }
                </div>
              </div>

              <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <ArrowRight size={15} className="text-white" />
              </div>
            </motion.div>
          </Link>
        </div>
      )}
    </div>
  )
}
