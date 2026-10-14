'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Fraunces } from 'next/font/google'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Check, Crown, Gem, Gamepad2, Lock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { getCourseUnits, type CourseUnit } from '@/lib/course-units'

// Editorial display face for unit titles and numerals; body text stays Lexend
const display = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], weight: ['400', '600'] })

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

// ── Path geometry ─────────────────────────────────────────────────────────────
// Nodes sit on a gentle sine wave; x is a % of the column width, rows are fixed
// height so the SVG route can be computed without measuring the DOM.

const ROW_H = 116
const AMPLITUDE = 24

function nodeX(globalIndex: number): number {
  return 50 + AMPLITUDE * Math.sin(globalIndex * 0.9)
}

function routePath(xs: number[]): string {
  return xs.map((x, i) => {
    const y = i * ROW_H + ROW_H / 2
    if (i === 0) return `M ${x} ${y}`
    const prevY = y - ROW_H
    const midY = prevY + ROW_H / 2
    return `C ${xs[i - 1]} ${midY}, ${x} ${midY}, ${x} ${y}`
  }).join(' ')
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// ── Small pieces ──────────────────────────────────────────────────────────────

function StarRow({ stars, size = 11, muted = 'text-slate-300 dark:text-white/15' }: { stars: number; size?: number; muted?: string }) {
  return (
    <span className="inline-flex items-center gap-px">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          size={size}
          strokeWidth={stars >= n ? 0 : 1.6}
          className={stars >= n ? 'text-amber-400 fill-amber-400' : cn(muted, 'fill-transparent')}
        />
      ))}
    </span>
  )
}

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

function ProgressRing({ value, size = 64, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (value / 100) * circ }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

/** Progress traced along a rounded square, matching the node shape */
function SquircleProgress({ value, size, radius }: { value: number; size: number; radius: number }) {
  const stroke = 4
  return (
    <svg width={size} height={size} className="absolute inset-0 overflow-visible">
      <rect x={stroke / 2} y={stroke / 2} width={size - stroke} height={size - stroke} rx={radius} fill="none" strokeWidth={stroke} className="stroke-primary/20" />
      <motion.rect
        x={stroke / 2} y={stroke / 2} width={size - stroke} height={size - stroke} rx={radius}
        fill="none" strokeWidth={stroke} strokeLinecap="round" pathLength={100}
        className="stroke-primary"
        strokeDasharray="100 100"
        initial={{ strokeDashoffset: 100 }}
        animate={{ strokeDashoffset: 100 - value }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

// ── Lesson node + label ───────────────────────────────────────────────────────

function LessonStop({ mod, number, x, row, labelSide }: {
  mod: LearnModule
  number: number
  x: number
  row: number
  labelSide: 'left' | 'right'
}) {
  const t = useTranslations('learn')
  const isDone = mod.state === 'completed'
  const isCurrent = mod.state === 'current'
  const isLocked = mod.state === 'locked'
  const top = row * ROW_H + ROW_H / 2
  const nodeSize = isCurrent ? 72 : 58

  const node = (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      whileHover={!isLocked ? { y: -3 } : undefined}
      whileTap={!isLocked ? { scale: 0.93, y: 2 } : undefined}
      className="relative"
      style={{ width: nodeSize, height: nodeSize }}
    >
      {/* Halo for the lesson to do next */}
      {isCurrent && (
        <>
          <motion.span
            className="absolute -inset-2 rounded-[28px] bg-primary/25"
            animate={{ scale: [1, 1.22], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <span className="absolute -inset-[9px]">
            <SquircleProgress value={mod.progress} size={nodeSize + 18} radius={28} />
          </span>
        </>
      )}

      <div
        className={cn(
          'relative z-10 size-full rounded-[22px] flex items-center justify-center select-none transition-colors',
          isCurrent && 'bg-gradient-to-br from-[#ff9a73] to-primary text-[34px] shadow-[0_6px_0_#c4612e,0_14px_30px_-8px_rgba(255,128,82,0.6)]',
          isDone && 'bg-white dark:bg-[#262d40] text-[28px] border-2 border-emerald-400/60 shadow-[0_5px_0_rgba(16,185,129,0.35)]',
          mod.state === 'available' && 'bg-white dark:bg-[#262d40] text-[28px] border-2 border-primary/40 shadow-[0_5px_0_rgba(255,128,82,0.25)]',
          isLocked && 'bg-[#eeebe8] dark:bg-white/[0.04] text-[26px] border-2 border-dashed border-black/10 dark:border-white/10',
        )}
      >
        <span className={cn('leading-none', isLocked && 'grayscale opacity-40')}>{mod.icon}</span>

        {isDone && (
          <span className="absolute -bottom-1.5 -right-1.5 size-6 rounded-full bg-emerald-500 border-[3px] border-[#f6f4f2] dark:border-[#171b28] flex items-center justify-center">
            <Check size={12} strokeWidth={3.5} className="text-white" />
          </span>
        )}
        {isDone && mod.hasCrown && (
          <span className="absolute -top-2 -right-2 size-6 rounded-full bg-violet-600 border-[3px] border-[#f6f4f2] dark:border-[#171b28] flex items-center justify-center">
            <Crown size={11} className="text-white fill-white" />
          </span>
        )}
        {isLocked && (
          <span className="absolute -bottom-1.5 -right-1.5 size-6 rounded-full bg-slate-200 dark:bg-[#2a3146] border-[3px] border-[#f6f4f2] dark:border-[#171b28] flex items-center justify-center">
            <Lock size={10} strokeWidth={2.8} className="text-slate-400" />
          </span>
        )}
      </div>
    </motion.div>
  )

  const label = (
    <motion.div
      initial={{ opacity: 0, x: labelSide === 'right' ? -8 : 8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={cn('flex flex-col min-w-0', labelSide === 'left' ? 'items-end text-right' : 'items-start text-left')}
    >
      <span className={cn(
        'text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums',
        isCurrent ? 'text-primary' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
      )}>
        {t('lesson_number', { n: pad2(number) })}
      </span>
      <span className={cn(
        'font-semibold leading-snug line-clamp-2 mt-0.5',
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
      <span className="mt-1.5">
        {isDone && <StarRow stars={mod.stars} />}
        {isCurrent && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-[0_3px_0_#c4612e]">
            {mod.lessonsCompleted > 0 ? t('continue') : t('start')}
            <ArrowRight size={12} strokeWidth={2.6} />
          </span>
        )}
        {mod.state === 'available' && (
          <span className="text-[10px] font-semibold text-primary/80">{t('ready')}</span>
        )}
      </span>
    </motion.div>
  )

  const half = nodeSize / 2
  const content = (
    <>
      <div className="absolute z-10" style={{ left: `calc(${x}% - ${half}px)`, top: top - half }}>
        {node}
      </div>
      <div
        className="absolute z-10 -translate-y-1/2"
        style={labelSide === 'right'
          ? { left: `calc(${x}% + ${half + 16}px)`, right: 4, top }
          : { right: `calc(${100 - x}% + ${half + 16}px)`, left: 4, top }}
      >
        {label}
      </div>
    </>
  )

  if (isLocked) {
    return <div title={t('locked_hint')}>{content}</div>
  }
  return (
    <Link href={`/learn/${mod.slug}`} aria-label={`${t('lesson_number', { n: number })}: ${mod.title}`} className="focus-visible:outline-none group">
      {content}
    </Link>
  )
}

// ── Unit section ──────────────────────────────────────────────────────────────

function UnitSection({ unit, index, modules, translationLang }: {
  unit: CourseUnit
  index: number
  modules: LearnModule[]
  translationLang: string
}) {
  const t = useTranslations('learn')
  const unitModules = modules.slice(unit.from - 1, unit.to)
  const xs = unitModules.map((_, i) => nodeX(unit.from - 1 + i))
  const done = unitModules.filter(m => m.state === 'completed').length
  const pct = Math.round((done / unitModules.length) * 100)
  const isComplete = done === unitModules.length
  // The route is drawn solid up to the furthest lesson reached in this unit
  const lastReached = unitModules.reduce((acc, m, i) => (m.state === 'completed' || m.state === 'current' ? i : acc), -1)
  const isLocked = unitModules.every(m => m.state === 'locked')

  const title = unit.title || t('unit', { n: index + 1 })
  const translation = unit.translations[translationLang] ?? unit.translations.en
  const height = unitModules.length * ROW_H

  return (
    <section id={`unit-${index + 1}`} className="scroll-mt-20">
      {/* Unit header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative overflow-hidden rounded-[28px] p-5 md:p-6 border',
          isLocked
            ? 'bg-white/50 dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05]'
            : 'bg-white dark:bg-[#202638] border-black/[0.04] dark:border-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.05)]',
        )}
      >
        {/* Oversized numeral */}
        <span
          aria-hidden
          className={cn(
            display.className,
            'pointer-events-none absolute -right-2 -top-6 text-[8.5rem] font-semibold leading-none tracking-tighter select-none',
            isLocked ? 'text-black/[0.03] dark:text-white/[0.03]' : 'text-primary/[0.09]',
          )}
        >
          {pad2(index + 1)}
        </span>

        <div className="relative flex items-start gap-4">
          <span className={cn(
            'size-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl',
            isComplete ? 'bg-emerald-500/15' : isLocked ? 'bg-black/[0.04] dark:bg-white/[0.05] grayscale' : 'bg-primary/12',
          )}>
            {unit.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {t('unit', { n: index + 1 })} · {unit.from}–{unit.to}
            </p>
            <h2 className={cn(display.className, 'mt-1 text-[1.6rem] md:text-[1.8rem] leading-[1.1] italic', isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white')}>
              {title}
            </h2>
            {translation && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{translation}</p>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', isComplete ? 'bg-emerald-500' : 'bg-primary')}
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className={cn('text-[11px] font-bold tabular-nums', isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
            {isComplete ? `✓ ${t('unit_done')}` : `${done}/${unitModules.length}`}
          </span>
        </div>
      </motion.header>

      {/* Route */}
      <div className="relative my-4" style={{ height }}>
        <svg
          aria-hidden
          className="absolute inset-0 size-full overflow-visible"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
        >
          <path
            d={routePath(xs)}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.1 11"
            vectorEffect="non-scaling-stroke"
            className="stroke-black/[0.14] dark:stroke-white/[0.14]"
          />
          {lastReached > 0 && (
            <path
              d={routePath(xs.slice(0, lastReached + 1))}
              fill="none"
              strokeWidth={5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={isComplete ? 'stroke-emerald-400/70' : 'stroke-primary/60'}
            />
          )}
        </svg>

        {unitModules.map((mod, i) => (
          <LessonStop
            key={mod.id}
            mod={mod}
            number={unit.from + i}
            x={xs[i]}
            row={i}
            labelSide={xs[i] <= 50 ? 'right' : 'left'}
          />
        ))}
      </div>

      {/* Practice break between units */}
      <Link
        href="/play"
        className={cn(
          'group mx-auto mb-10 flex max-w-xs items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 transition-colors',
          'border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/[0.06]',
        )}
      >
        <span className="size-9 shrink-0 rounded-xl bg-amber-400/15 flex items-center justify-center">
          <Gamepad2 size={18} className="text-amber-500" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100">{t('practice_title')}</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t('practice_desc', { gems: 5 })}</span>
        </span>
        <ArrowRight size={15} className="text-amber-500 transition-transform group-hover:translate-x-0.5" />
      </Link>
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
                  <h1 className={cn(display.className, 'text-[1.55rem] leading-tight italic text-slate-900 dark:text-white')}>
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
                  <h3 className={cn(display.className, 'relative mt-2 text-[1.45rem] leading-tight italic pr-10')}>
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
                    <span className={cn(display.className, 'text-lg font-semibold tabular-nums w-7', active ? 'text-primary' : 'text-slate-300 dark:text-slate-600')}>
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
              <UnitSection key={i} unit={u} index={i} modules={modules} translationLang={translationLang} />
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
