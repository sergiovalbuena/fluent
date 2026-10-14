'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Crown, Gem, Gamepad2, Lock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { getCourseUnits, type CourseUnit } from '@/lib/course-units'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LearnModule = {
  id: string
  slug: string
  title: string
  /** Secondary title (module description), shown under the title */
  subtitle?: string
  icon: string
  progress: number          // lesson completion %
  state: 'completed' | 'current' | 'available' | 'locked'
  totalLessons: number
  lessonsCompleted: number
  stars: 0 | 1 | 2 | 3
  hasCrown: boolean
  gemsEarned: number
}

export type Props = {
  modules: LearnModule[]
  languageName: string
  languageFlag: string
}

// ── Worlds ────────────────────────────────────────────────────────────────────
// Each unit is a "world" on the map with its own colour and scenery

type World = { color: string; shade: string; scenery: string[] }

const WORLDS: World[] = [
  { color: '#22c55e', shade: '#15803d', scenery: ['🌳', '🌼', '🍄', '🌿'] },
  { color: '#0ea5e9', shade: '#0369a1', scenery: ['🏙️', '🗺️', '🌍', '🚲'] },
  { color: '#a855f7', shade: '#7e22ce', scenery: ['🎪', '🎨', '🎬', '🎈'] },
  { color: '#f97316', shade: '#c2410c', scenery: ['☁️', '🏝️', '✈️', '🧭'] },
  { color: '#f43f5e', shade: '#be123c', scenery: ['🏡', '🌳', '☕', '🔑'] },
  { color: '#eab308', shade: '#a16207', scenery: ['☀️', '🌻', '🚂', '🥐'] },
]

// ── Path geometry ─────────────────────────────────────────────────────────────
// Levels sit on a sine wave; x is a % of the column width, rows have a fixed
// height so the road can be computed without measuring the DOM.

const ROW_H = 132
const AMPLITUDE = 24

function nodeX(globalIndex: number): number {
  return 50 + AMPLITUDE * Math.sin(globalIndex * 0.9)
}

function routePath(xs: number[]): string {
  return xs.map((x, i) => {
    const y = i * ROW_H + ROW_H / 2
    if (i === 0) return `M ${x} ${y}`
    const midY = y - ROW_H / 2
    return `C ${xs[i - 1]} ${midY}, ${x} ${midY}, ${x} ${y}`
  }).join(' ')
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// ── Small pieces ──────────────────────────────────────────────────────────────

/** One segment per activity of the module */
function ActivityPips({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('h-1.5 flex-1 min-w-3 rounded-full', i < done ? 'bg-current' : 'bg-current opacity-25')} />
      ))}
    </span>
  )
}

function ProgressRing({ value, size = 64, stroke = 6, trackClassName = 'stroke-black/[0.06] dark:stroke-white/[0.08]', className = 'stroke-primary' }: {
  value: number; size?: number; stroke?: number; trackClassName?: string; className?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        className={className}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (value / 100) * circ }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

/** Three stars fanned in an arc above a level */
function StarArc({ stars }: { stars: number }) {
  return (
    <span className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 z-20">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          size={n === 2 ? 17 : 14}
          strokeWidth={stars >= n ? 1.2 : 1.8}
          className={cn(
            n === 2 ? '-translate-y-1.5' : '',
            stars >= n
              ? 'text-amber-500 fill-amber-400 drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]'
              : 'text-slate-300 fill-slate-200 dark:text-white/20 dark:fill-white/10',
          )}
        />
      ))}
    </span>
  )
}

// ── Locked level tooltip ──────────────────────────────────────────────────────

// Best case per activity, mirroring the lesson player's rules: 10 XP + 20 first
// completion + 10 for three stars, and 2 gems for a perfect score
const MAX_XP_PER_ACTIVITY = 40
const MAX_GEMS_PER_ACTIVITY = 2

type UnlockInfo = { prevNumber: number; prevTitle: string; prevDone: number; prevTotal: number; stepsAway: number }

function LockedTooltip({ mod, unlock, align }: { mod: LearnModule; unlock: UnlockInfo; align: 'left' | 'right' }) {
  const t = useTranslations('learn')
  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-[calc(100%+16px)] z-50 w-[250px] text-left rounded-2xl bg-[#1c2131] text-white p-3.5 shadow-[0_6px_0_rgba(0,0,0,0.35),0_18px_40px_-12px_rgba(0,0,0,0.6)] border border-white/10',
        'opacity-0 translate-y-1 scale-95 transition-all duration-150',
        'group-hover/lock:opacity-100 group-hover/lock:translate-y-0 group-hover/lock:scale-100',
        'group-focus/lock:opacity-100 group-focus/lock:translate-y-0 group-focus/lock:scale-100',
        align === 'left' ? 'left-0' : 'right-0',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Lock size={13} strokeWidth={2.6} /></span>
        <p className="text-[11px] font-black uppercase tracking-widest text-white/70">{t('locked_title')}</p>
      </div>

      <p className="mt-2.5 text-[13px] font-bold leading-snug">{t('unlock_next', { n: pad2(unlock.prevNumber) })}</p>
      <div className="mt-2">
        <p className="text-[11px] text-white/60 truncate">
          {t('prev_progress', { title: unlock.prevTitle, done: unlock.prevDone, total: unlock.prevTotal })}
        </p>
        <ActivityPips done={unlock.prevDone} total={unlock.prevTotal} className="mt-1.5 text-primary" />
      </div>
      {unlock.stepsAway > 1 && (
        <p className="mt-2 text-[11px] font-semibold text-white/70">🏁 {t('unlock_far', { count: unlock.stepsAway })}</p>
      )}

      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5">{t('rewards')}</p>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/15 text-amber-300 px-2 py-0.5">
            <Star size={10} className="fill-amber-300" /><Star size={10} className="fill-amber-300" /><Star size={10} className="fill-amber-300" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-[#ffb197] px-2 py-0.5">
            ⚡ {t('reward_xp', { xp: mod.totalLessons * MAX_XP_PER_ACTIVITY })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 text-sky-300 px-2 py-0.5">
            <Gem size={10} /> {t('reward_gems', { gems: mod.totalLessons * MAX_GEMS_PER_ACTIVITY })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Level (lesson) ────────────────────────────────────────────────────────────

function Level({ mod, number, x, row, labelSide, world, unlock }: {
  mod: LearnModule
  number: number
  x: number
  row: number
  labelSide: 'left' | 'right'
  world: World
  unlock?: UnlockInfo
}) {
  const t = useTranslations('learn')
  const isDone = mod.state === 'completed'
  const isCurrent = mod.state === 'current'
  const isLocked = mod.state === 'locked'
  const top = row * ROW_H + ROW_H / 2
  const size = isCurrent ? 80 : 66
  const half = size / 2

  // Chunky "3D" button: face colour + darker base
  const face = isCurrent
    ? { background: 'linear-gradient(180deg,#ffa47f 0%,#ff8052 100%)', boxShadow: '0 7px 0 #c4612e, 0 16px 26px -10px rgba(255,128,82,0.7)' }
    : isDone
    ? { background: `linear-gradient(180deg, ${world.color} 0%, ${world.shade} 140%)`, boxShadow: `0 6px 0 ${world.shade}, 0 12px 20px -10px ${world.shade}` }
    : undefined

  const node = (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      whileHover={!isLocked ? { y: -4, scale: 1.04 } : undefined}
      whileTap={!isLocked ? { y: 4, scale: 0.97 } : undefined}
      className="relative"
      style={{ width: size, height: size }}
    >
      {isCurrent && (
        <>
          {/* Bouncing call to action, like a "press start" bubble */}
          <motion.span
            className="absolute left-1/2 -top-12 z-30 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white dark:bg-[#2a3146] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-primary shadow-[0_4px_0_rgba(0,0,0,0.12)] border-2 border-primary/30"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            {mod.lessonsCompleted > 0 ? t('continue') : t('start')}
            <span className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 size-3 rotate-45 bg-white dark:bg-[#2a3146] border-r-2 border-b-2 border-primary/30" />
          </motion.span>
          <motion.span
            className="absolute -inset-3 rounded-full bg-primary/25"
            animate={{ scale: [0.9, 1.25], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <span className="absolute -inset-[9px]">
            <ProgressRing value={mod.progress} size={size + 18} stroke={5} trackClassName="stroke-primary/20" />
          </span>
        </>
      )}

      {isDone && <StarArc stars={mod.stars} />}

      <div
        style={face}
        className={cn(
          'relative z-10 size-full rounded-full flex items-center justify-center select-none',
          isCurrent && 'text-[36px]',
          isDone && 'text-[30px]',
          mod.state === 'available' && 'text-[30px] bg-white dark:bg-[#2a3146] border-4 shadow-[0_6px_0_rgba(0,0,0,0.12)] dark:shadow-[0_6px_0_rgba(0,0,0,0.45)]',
          isLocked && 'text-[28px] bg-[#e4e0dc] dark:bg-[#262c3d] shadow-[0_6px_0_#c9c4bf] dark:shadow-[0_6px_0_#151925]',
        )}
      >
        {mod.state === 'available' && <span className="absolute inset-0 rounded-full border-4" style={{ borderColor: world.color }} />}
        {/* Glossy highlight */}
        {(isDone || isCurrent) && <span className="absolute inset-x-3 top-1.5 h-1/3 rounded-full bg-white/25" />}
        <span className={cn('relative leading-none', isLocked && 'grayscale opacity-35')}>{mod.icon}</span>

        {isLocked && (
          <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-slate-400 dark:bg-slate-600 border-[3px] border-[#f6f4f2] dark:border-[#171b28] flex items-center justify-center">
            <Lock size={10} strokeWidth={3} className="text-white" />
          </span>
        )}
        {isDone && mod.hasCrown && (
          <span className="absolute -bottom-1 -right-1 size-7 rounded-full bg-violet-600 border-[3px] border-[#f6f4f2] dark:border-[#171b28] flex items-center justify-center">
            <Crown size={12} className="text-white fill-white" />
          </span>
        )}
      </div>
    </motion.div>
  )

  const label = (
    <motion.div
      initial={{ opacity: 0, x: labelSide === 'right' ? -10 : 10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className={cn('flex flex-col min-w-0', labelSide === 'left' ? 'items-end text-right' : 'items-start text-left')}
    >
      <span
        className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums tracking-wider text-white', isLocked && 'bg-slate-300 dark:bg-slate-700')}
        style={isLocked ? undefined : { background: isCurrent ? '#ff8052' : world.color }}
      >
        {t('lesson_number', { n: pad2(number) })}
      </span>
      <span className={cn(
        'font-bold leading-snug line-clamp-2 mt-1',
        isCurrent ? 'text-[15px] text-slate-900 dark:text-white' : 'text-[13px]',
        isLocked ? 'text-slate-400 dark:text-slate-500' : !isCurrent && 'text-slate-800 dark:text-slate-100',
      )}>
        {mod.title}
      </span>
      {mod.subtitle && (
        <span className={cn('text-[11px] leading-snug line-clamp-1 mt-0.5', isLocked ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400')}>
          {mod.subtitle}
        </span>
      )}
      {isCurrent && mod.totalLessons > 0 && (
        <ActivityPips done={mod.lessonsCompleted} total={mod.totalLessons} className="mt-2 w-28 text-primary" />
      )}
    </motion.div>
  )

  const content = (
    <>
      <div className="absolute z-10 hover:z-40 focus-within:z-40" style={{ left: `calc(${x}% - ${half}px)`, top: top - half }}>
        {isLocked && unlock ? (
          // Focusable so a tap on mobile shows the tooltip too
          <button type="button" className="group/lock relative block cursor-help focus:outline-none" aria-label={t('locked_title')}>
            <LockedTooltip mod={mod} unlock={unlock} align={x <= 50 ? 'left' : 'right'} />
            {node}
          </button>
        ) : node}
      </div>
      <div
        className="absolute z-10 -translate-y-1/2"
        style={labelSide === 'right'
          ? { left: `calc(${x}% + ${half + 18}px)`, right: 4, top }
          : { right: `calc(${100 - x}% + ${half + 18}px)`, left: 4, top }}
      >
        {label}
      </div>
    </>
  )

  if (isLocked) return <div>{content}</div>
  return (
    <Link href={`/learn/${mod.slug}`} aria-label={`${t('lesson_number', { n: number })}: ${mod.title}`} className="focus-visible:outline-none">
      {content}
    </Link>
  )
}

// ── Treasure chest at the end of each world ──────────────────────────────────

function Chest({ x, row, labelSide, world, open }: { x: number; row: number; labelSide: 'left' | 'right'; world: World; open: boolean }) {
  const t = useTranslations('learn')
  const top = row * ROW_H + ROW_H / 2
  const half = 33
  return (
    <Link href="/play" className="focus-visible:outline-none">
      <motion.div
        className="absolute z-10"
        style={{ left: `calc(${x}% - ${half}px)`, top: top - half }}
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        whileHover={{ rotate: [-4, 4, -4, 0], scale: 1.06 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <div
          className="size-[66px] rounded-[20px] flex items-center justify-center text-[32px] border-4 border-amber-300"
          style={{ background: 'linear-gradient(180deg,#fcd34d,#f59e0b)', boxShadow: '0 6px 0 #b45309, 0 14px 24px -10px rgba(245,158,11,0.8)' }}
        >
          <span className={cn(!open && 'opacity-90')}>{open ? '🎁' : '🧰'}</span>
        </div>
        <span className="absolute -top-2 -right-3 flex items-center gap-0.5 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-[0_2px_0_#0369a1]">
          <Gem size={9} />+5
        </span>
      </motion.div>
      <div
        className="absolute z-10 -translate-y-1/2"
        style={labelSide === 'right'
          ? { left: `calc(${x}% + ${half + 18}px)`, right: 4, top }
          : { right: `calc(${100 - x}% + ${half + 18}px)`, left: 4, top }}
      >
        <div className={cn('flex flex-col', labelSide === 'left' ? 'items-end text-right' : 'items-start text-left')}>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white" style={{ background: world.shade }}>
            <Gamepad2 size={10} className="inline -mt-0.5 mr-1" />
            {t('practice_title')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t('practice_desc', { gems: 5 })}</span>
        </div>
      </div>
    </Link>
  )
}

// ── World (unit) ──────────────────────────────────────────────────────────────

function WorldSection({ unit, index, modules, translationLang }: {
  unit: CourseUnit
  index: number
  modules: LearnModule[]
  translationLang: string
}) {
  const t = useTranslations('learn')
  const world = WORLDS[index % WORLDS.length]
  // Where the learner is now; locked levels say what's needed to reach them
  const reachIdx = Math.max(modules.findIndex(m => m.state === 'current'), 0)
  const unlockInfo = (globalIdx: number): UnlockInfo | undefined => {
    const prev = modules[globalIdx - 1]
    if (!prev) return undefined
    return {
      prevNumber: globalIdx,
      prevTitle: prev.title,
      prevDone: prev.lessonsCompleted,
      prevTotal: prev.totalLessons,
      stepsAway: globalIdx - reachIdx,
    }
  }
  const unitModules = modules.slice(unit.from - 1, unit.to)
  // One extra stop at the end of the road for the chest
  const xs = [...unitModules.map((_, i) => nodeX(unit.from - 1 + i)), nodeX(unit.to)]
  const done = unitModules.filter(m => m.state === 'completed').length
  const pct = Math.round((done / unitModules.length) * 100)
  const isComplete = done === unitModules.length
  const isLocked = unitModules.every(m => m.state === 'locked')
  // The road is paved up to the furthest level reached
  const lastReached = isComplete
    ? xs.length - 1
    : unitModules.reduce((acc, m, i) => (m.state === 'completed' || m.state === 'current' ? i : acc), -1)

  const title = unit.title || t('unit', { n: index + 1 })
  const translation = unit.translations[translationLang] ?? unit.translations.en
  const height = xs.length * ROW_H
  const sideOf = (x: number): 'left' | 'right' => (x <= 50 ? 'right' : 'left')

  return (
    <section id={`unit-${index + 1}`} className="scroll-mt-20 mb-6">
      {/* World banner */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn('relative overflow-hidden rounded-[26px] p-5 text-white', isLocked && 'grayscale-[0.7] opacity-80')}
        style={{
          background: `linear-gradient(135deg, ${world.color} 0%, ${world.shade} 100%)`,
          boxShadow: `0 7px 0 ${world.shade}, 0 18px 30px -16px ${world.shade}`,
        }}
      >
        {/* Pattern + oversized emoji for depth */}
        <span aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.2px, transparent 0)', backgroundSize: '14px 14px' }} />
        <span aria-hidden className="absolute -right-3 -bottom-6 text-[6.5rem] leading-none opacity-25 rotate-[-10deg] select-none">{unit.emoji}</span>

        <div className="relative flex items-center gap-4">
          <span className="size-14 shrink-0 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-[28px] shadow-[0_4px_0_rgba(0,0,0,0.15)]">
            {isLocked ? <Lock size={22} strokeWidth={2.6} /> : unit.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
              {t('unit', { n: index + 1 })} · {unit.from}–{unit.to}
            </p>
            <h2 className="mt-0.5 text-xl md:text-2xl font-bold leading-tight">{title}</h2>
            {translation && <p className="text-xs text-white/80 mt-0.5">{translation}</p>}
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-black/20 overflow-hidden p-0.5">
            <motion.div
              className="h-full rounded-full bg-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]"
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.max(pct, 0)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-xs font-black tabular-nums">
            {isComplete ? `✓ ${t('unit_done')}` : `${done}/${unitModules.length}`}
          </span>
        </div>
      </motion.header>

      {/* Map */}
      <div className="relative mt-6" style={{ height }}>
        {/* Scenery on the open side of every other row */}
        {xs.slice(0, -1).map((x, i) => i % 2 === 1 ? null : (
          <motion.span
            key={`deco-${i}`}
            aria-hidden
            className="absolute text-2xl select-none pointer-events-none opacity-60"
            style={{ top: i * ROW_H + ROW_H / 2 - 14, ...(sideOf(x) === 'right' ? { left: '2%' } : { right: '2%' }) }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          >
            {world.scenery[(i / 2) % world.scenery.length]}
          </motion.span>
        ))}

        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
          {/* Road */}
          <path d={routePath(xs)} fill="none" strokeWidth={30} strokeLinecap="round" vectorEffect="non-scaling-stroke"
            className="stroke-[#e7e2dd] dark:stroke-[#232a3b]" />
          {lastReached > 0 && (
            <path d={routePath(xs.slice(0, lastReached + 1))} fill="none" strokeWidth={30} strokeLinecap="round" vectorEffect="non-scaling-stroke"
              stroke={world.color} strokeOpacity={0.35} />
          )}
          {/* Centre line */}
          <path d={routePath(xs)} fill="none" strokeWidth={3} strokeLinecap="round" strokeDasharray="6 10" vectorEffect="non-scaling-stroke"
            className="stroke-white/80 dark:stroke-white/15" />
        </svg>

        {unitModules.map((mod, i) => (
          <Level
            key={mod.id}
            mod={mod}
            number={unit.from + i}
            x={xs[i]}
            row={i}
            labelSide={sideOf(xs[i])}
            world={world}
            unlock={mod.state === 'locked' ? unlockInfo(unit.from - 1 + i) : undefined}
          />
        ))}
        <Chest x={xs[xs.length - 1]} row={xs.length - 1} labelSide={sideOf(xs[xs.length - 1])} world={world} open={isComplete} />
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LearnContent({ modules, languageName, languageFlag }: Props) {
  const t = useTranslations('learn')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const { languageCode, translationLang } = useActiveLanguage()

  const units = useMemo(() => getCourseUnits(languageCode, modules.length), [languageCode, modules.length])
  const courseName = useMemo(() => {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(languageCode) ?? languageName
    return locale === 'en' || locale === 'de' ? name : name.toLocaleLowerCase(locale)
  }, [locale, languageCode, languageName])

  const currentIdx = modules.findIndex(m => m.state === 'current')
  const current = currentIdx >= 0 ? modules[currentIdx] : null
  const completed = modules.filter(m => m.state === 'completed').length
  const pct = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0
  const stars = modules.reduce((s, m) => s + m.stars, 0)
  const crowns = modules.filter(m => m.hasCrown).length
  const gems = modules.reduce((s, m) => s + m.gemsEarned, 0)
  const currentUnit = current ? units.findIndex(u => currentIdx + 1 >= u.from && currentIdx + 1 <= u.to) : -1

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={tNav('lessons')} subtitle={`${languageFlag} ${courseName}`} />

      <main className="flex-1 px-3 md:px-6 pt-4 md:pt-8 pb-36 md:pb-16">
        <div className="mx-auto max-w-6xl grid grid-cols-[minmax(0,1fr)] gap-5 md:gap-8 md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">

          {/* ── Side panel: overview, up next, units ──────────────────────── */}
          <aside className="min-w-0 md:sticky md:top-20 md:self-start space-y-4">

            {/* Course overview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative overflow-hidden rounded-[28px] bg-white dark:bg-[#202638] border border-black/[0.04] dark:border-white/[0.05] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
            >
              <div className="absolute -left-10 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
              <div className="relative flex items-center gap-4">
                <div className="relative shrink-0">
                  <ProgressRing value={pct} size={76} stroke={7} />
                  <span className="absolute inset-0 flex items-center justify-center text-3xl">{languageFlag}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                    {t('journey_title', { language: courseName })}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('journey_progress', { done: completed, total: modules.length })}
                  </p>
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-3 gap-2">
                {[
                  { icon: <Star size={14} className="text-amber-400 fill-amber-400" />, value: stars, label: t('stars') },
                  { icon: <Crown size={14} className="text-violet-500 fill-violet-500" />, value: crowns, label: t('crowns') },
                  { icon: <Gem size={14} className="text-sky-500" />, value: gems, label: t('gems') },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl bg-[#f6f4f2] dark:bg-white/[0.04] px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {s.icon}
                      <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Up next */}
            {current ? (
              <Link href={`/learn/${current.slug}`} className="block focus-visible:outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative overflow-hidden rounded-[28px] p-5 text-white bg-gradient-to-br from-[#ff9a73] via-primary to-[#e8643a] shadow-[0_6px_0_#c4612e,0_20px_40px_-16px_rgba(255,128,82,0.7)]"
                >
                  <span aria-hidden className="absolute -right-4 -bottom-8 text-[7.5rem] leading-none opacity-20 rotate-12 select-none">{current.icon}</span>
                  <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                    {t('up_next')} · {t('lesson_number', { n: pad2(currentIdx + 1) })}
                  </p>
                  <h3 className="relative mt-2 text-xl font-bold leading-tight pr-10">
                    {current.title}
                  </h3>
                  {current.subtitle && <p className="relative text-xs text-white/80 mt-1">{current.subtitle}</p>}
                  <div className="relative mt-4 text-white">
                    <ActivityPips done={current.lessonsCompleted} total={current.totalLessons} />
                    <p className="text-[10px] font-semibold text-white/75 mt-1.5 tabular-nums">
                      {t('activities', { done: current.lessonsCompleted, total: current.totalLessons })}
                    </p>
                  </div>
                  <span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white text-primary px-4 py-2 text-sm font-bold shadow-[0_3px_0_rgba(0,0,0,0.12)]">
                    {current.lessonsCompleted > 0 ? t('continue') : t('start')}
                    <ArrowRight size={15} strokeWidth={2.6} />
                  </span>
                </motion.div>
              </Link>
            ) : modules.length > 0 && completed === modules.length ? (
              <div className="rounded-[28px] p-5 bg-emerald-500 text-white font-bold text-center">{t('course_done')}</div>
            ) : null}

            {/* Units index */}
            <nav
              aria-label={t('units')}
              className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible -mx-3 px-3 md:mx-0 md:px-0 pb-1 md:pb-0 sticky md:static top-14 z-20 bg-[#f6f4f2]/90 dark:bg-[#171b28]/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-md md:backdrop-blur-none py-2 md:py-0"
            >
              <p className="hidden md:block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 px-1 pt-1">{t('units')}</p>
              {units.map((u, i) => {
                const mods = modules.slice(u.from - 1, u.to)
                const d = mods.filter(m => m.state === 'completed').length
                const active = i === currentUnit
                const locked = mods.every(m => m.state === 'locked')
                return (
                  <a
                    key={i}
                    href={`#unit-${i + 1}`}
                    className={cn(
                      'shrink-0 flex items-center gap-3 rounded-2xl px-3 py-2 md:py-2.5 border transition-colors',
                      active
                        ? 'bg-white dark:bg-[#202638] border-primary/40 shadow-sm'
                        : 'border-transparent hover:bg-white/70 dark:hover:bg-white/[0.04]',
                      locked && 'opacity-55',
                    )}
                  >
                    <span className={cn('text-base font-black tabular-nums w-7', active ? 'text-primary' : 'text-slate-300 dark:text-slate-600')}>
                      {pad2(i + 1)}
                    </span>
                    <span className="min-w-0 md:flex-1">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap md:whitespace-normal md:truncate">
                        {u.title || t('unit', { n: i + 1 })}
                      </span>
                      <span className="hidden md:flex items-center gap-2 mt-1">
                        <span className="flex-1 h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
                          <span
                            className={cn('block h-full rounded-full', d === mods.length ? 'bg-emerald-500' : 'bg-primary')}
                            style={{ width: `${(d / mods.length) * 100}%` }}
                          />
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{d}/{mods.length}</span>
                      </span>
                    </span>
                  </a>
                )
              })}
            </nav>
          </aside>

          {/* ── Journey ───────────────────────────────────────────────────── */}
          <div className="min-w-0 md:max-w-2xl md:w-full md:mx-auto">
            {units.map((u, i) => (
              <WorldSection key={i} unit={u} index={i} modules={modules} translationLang={translationLang} />
            ))}
          </div>
        </div>
      </main>

      {/* Mobile shortcut to the next lesson */}
      {current && (
        <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
          <Link href={`/learn/${current.slug}`}>
            <motion.span
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 320, damping: 28 }}
              className="flex items-center gap-2 rounded-full bg-primary pl-3 pr-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_0_#c4612e,0_12px_24px_-8px_rgba(255,128,82,0.7)]"
            >
              <span className="text-lg leading-none">{current.icon}</span>
              {t('lesson_number', { n: pad2(currentIdx + 1) })}
              <ArrowRight size={15} strokeWidth={2.6} />
            </motion.span>
          </Link>
        </div>
      )}
    </div>
  )
}
