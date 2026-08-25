'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, MessageSquare, HelpCircle,
  BookMarked, Shuffle, PenLine, Zap, Headphones,
  PlayCircle, Layers, Star, Crown, Lock, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638]',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

// ── Stars row ──────────────────────────────────────────────────────────────────
function StarsRow({ stars, size = 11 }: { stars: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          size={size}
          className={
            n <= stars
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
          }
        />
      ))}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type VocabItem  = { word: string; translation: string; icon?: string }
export type PhraseItem = { phrase: string; translation: string }
export type QAItem     = { question: string; options: string[]; correct: string | number }

export interface ModuleContentData {
  slug: string
  title: string
  description?: string | null
  icon: string
  languageCode?: string
  exerciseCount: number
  firstExType?: string
  vocabItems: VocabItem[]
  phraseItems: PhraseItem[]
  qaItems: QAItem[]
  storyText?: string
  arrangeCount: number
  translateCount: number
  hasVocab: boolean
  hasPhrases: boolean
  hasQA: boolean
  hasStory: boolean
  hasArrange: boolean
  hasTranslate: boolean
  starsMap?: Record<string, number>
  allThreeStars?: boolean
  hasCrown?: boolean
  masteredWords?: number
  masteredPhrases?: number
  masteredQA?: number
}

// ── Core activity card ────────────────────────────────────────────────────────
// Signature: top accent bar (activity color) + icon pill + real content preview
// Coherence: same surface, padding, radius, border, typography across all 4

type ActivityVariant = 'vocabulary' | 'phrases' | 'qa' | 'story'

const VARIANT_TOKENS: Record<ActivityVariant, {
  bar: string        // top accent bar bg
  iconBg: string     // icon container bg
  iconColor: string  // icon + text color
  chipBg: string     // preview chip bg (vocabulary)
}> = {
  vocabulary: {
    bar:       'bg-indigo-500',
    iconBg:    'bg-indigo-500/[0.10]',
    iconColor: 'text-indigo-500',
    chipBg:    'bg-indigo-500/[0.08] text-indigo-600 dark:text-indigo-400',
  },
  phrases: {
    bar:       'bg-teal-500',
    iconBg:    'bg-teal-500/[0.10]',
    iconColor: 'text-teal-600 dark:text-teal-400',
    chipBg:    '',
  },
  qa: {
    bar:       'bg-violet-500',
    iconBg:    'bg-violet-500/[0.10]',
    iconColor: 'text-violet-500',
    chipBg:    '',
  },
  story: {
    bar:       'bg-amber-500',
    iconBg:    'bg-amber-500/[0.10]',
    iconColor: 'text-amber-600 dark:text-amber-400',
    chipBg:    '',
  },
}

interface CoreCardProps {
  href: string
  icon: React.ElementType
  variant: ActivityVariant
  label: string
  total: number
  unit: string
  mastered: number
  stars: number
  available: boolean
}

function CoreCard({ href, icon: Icon, variant, label, total, unit, mastered, stars, available }: CoreCardProps) {
  if (!available) return null
  const t = VARIANT_TOKENS[variant]

  return (
    <Link href={href} className="block group h-full">
      <motion.div
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none cursor-pointer"
      >
        {/* Top accent bar */}
        <div className={cn('h-[3px] w-full shrink-0', t.bar)} />

        <div className="flex flex-col flex-1 gap-3 p-4">
          {/* Title + stars — same level */}
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-base text-slate-900 dark:text-white leading-snug">{label}</p>
            <StarsRow stars={stars} size={15} />
          </div>

          {/* Icon + count — bigger, the card's focal point */}
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className={cn('size-12 rounded-xl flex items-center justify-center shrink-0', t.iconBg)}>
              <Icon size={22} className={t.iconColor} />
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {mastered > 0
                ? <><span className="text-primary font-bold">{mastered}</span><span className="text-slate-400 dark:text-slate-500"> / {total} {unit}</span></>
                : <span className="text-slate-400 dark:text-slate-500">{total} {unit}</span>
              }
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Mini activity card (bottom row) ──────────────────────────────────────────
interface MiniCardProps {
  href: string
  icon: React.ElementType
  label: string
  bg: string
  stars?: number
  tilt?: string
}

function MiniCard({ href, icon: Icon, label, bg, stars, tilt = '2.5deg' }: MiniCardProps) {
  return (
    <Link href={href} className="shrink-0">
      <motion.div
        whileHover={{ rotate: tilt, scale: 1.07, filter: 'brightness(1.1) saturate(1.1)' }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl min-w-[100px] min-h-[96px] cursor-pointer',
          bg
        )}
      >
        {stars !== undefined && stars > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5">
            {[1, 2, 3].map(n => (
              <Star key={n} size={9} className={n <= stars ? 'fill-white text-white' : 'fill-white/25 text-white/25'} />
            ))}
          </div>
        )}
        <Icon size={24} className="text-white" />
        <p className="text-[11px] font-bold text-white text-center leading-tight">{label}</p>
      </motion.div>
    </Link>
  )
}

// ── Crown Challenge card (standalone, full width) ──────────────────────────────
// Three states: locked → unlocked → crowned — all three are clickable so the
// challenge stays a live, replayable destination even after it's been earned.
// Signature: per-activity star tracker in locked state (shows exactly what's missing)

interface CrownBandProps {
  slug: string
  allThreeStars: boolean
  hasCrown: boolean
  starsMap: Record<string, number>
  hasVocab: boolean
  hasPhrases: boolean
  hasQA: boolean
  hasStory: boolean
}

const CORE_ACTIVITY_META = [
  { key: 'vocabulary', label: 'Vocab',   flag: 'hasVocab'   },
  { key: 'phrases',    label: 'Phrases', flag: 'hasPhrases' },
  { key: 'qa',         label: 'Q&A',     flag: 'hasQA'      },
  { key: 'story',      label: 'Story',   flag: 'hasStory'   },
] as const

function CrownBand({ slug, allThreeStars, hasCrown, starsMap, hasVocab, hasPhrases, hasQA, hasStory }: CrownBandProps) {
  const flagMap = { hasVocab, hasPhrases, hasQA, hasStory }
  const activeCore = CORE_ACTIVITY_META.filter(a => flagMap[a.flag])

  // ── CROWNED — still a live link so the challenge can be replayed anytime ──
  if (hasCrown) {
    return (
      <Link href={`/learn/${slug}/mastery`} className="block group relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
        <motion.div
          animate={{ opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none"
        >
          <Crown size={44} className="text-white" />
        </motion.div>
        <div className="relative flex items-center justify-between gap-3 px-4 md:px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-white/25 flex items-center justify-center shrink-0">
              <Crown size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[13px] text-white leading-tight">Module Mastered</p>
              <p className="text-[11px] text-white/70 truncate">Crown earned · you can use this in real life</p>
            </div>
          </div>
          <motion.span
            whileHover={{ x: 2 }}
            className="flex items-center gap-1 text-white/90 group-hover:text-white font-bold text-[11px] shrink-0"
          >
            Replay <ChevronRight size={12} />
          </motion.span>
        </div>
      </Link>
    )
  }

  // ── UNLOCKED — all ⭐⭐⭐, ready to challenge ──────────────────────────────
  if (allThreeStars) {
    return (
      <Link href={`/learn/${slug}/mastery`} className="block group relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        <motion.div
          animate={{ opacity: [0.15, 0.25, 0.15], scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none"
        >
          <Crown size={48} className="text-white" />
        </motion.div>
        <div className="relative flex items-center justify-between gap-3 px-4 md:px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 16px rgba(251,191,36,0.6)', '0 0 0px rgba(251,191,36,0)'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="size-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
            >
              <Crown size={16} className="text-white" />
            </motion.div>
            <div className="min-w-0">
              <p className="font-black text-[13px] text-white leading-tight tracking-tight">Crown Challenge ready</p>
              <p className="text-[11px] text-white/80 font-medium truncate">All ⭐⭐⭐ earned — take the ultimate test</p>
            </div>
          </div>
          <motion.span
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 bg-white text-amber-600 font-black text-[11px] px-3 py-1.5 rounded-lg shrink-0 shadow-sm"
          >
            Begin <ChevronRight size={12} />
          </motion.span>
        </div>
      </Link>
    )
  }

  // ── LOCKED — compact motivator: icon + fraction + thin bar. No per-activity
  // pills here — that breakdown already lives in the Essential cards below.
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-[#131722] via-[#171b28] to-[#0d0f18]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,128,82,0.06),transparent_70%)]" />
      <motion.div
        animate={{ opacity: [0.06, 0.11, 0.06] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none"
      >
        <Crown size={52} className="text-amber-400" />
      </motion.div>
      <div className="relative flex items-center gap-3 px-4 md:px-5 py-3">
        <div className="size-9 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
          <Lock size={14} className="text-white/50" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <p className="font-black text-[13px] text-white/90 leading-tight tracking-tight">Crown Challenge</p>
          <div className="flex items-center gap-1 shrink-0">
            {activeCore.map((a, i) => {
              const earned = (starsMap[a.key] ?? 0) >= 3
              return (
                <motion.span
                  key={a.key}
                  initial={false}
                  animate={earned ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Star
                    size={14}
                    className={earned ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/20'}
                  />
                </motion.span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ModuleContentView({ data }: { data: ModuleContentData }) {
  const {
    slug, title, description, icon, languageCode, exerciseCount, firstExType,
    vocabItems, phraseItems, qaItems, storyText,
    arrangeCount, translateCount,
    hasVocab, hasPhrases, hasQA, hasStory, hasArrange, hasTranslate,
    starsMap = {},
    allThreeStars = false,
    hasCrown = false,
    masteredWords = 0,
    masteredPhrases = 0,
    masteredQA = 0,
  } = data

  const activityFlags = [hasVocab, hasPhrases, hasQA, hasStory, hasArrange, hasTranslate]
  const activityKeys  = ['vocabulary', 'phrases', 'qa', 'story', 'arrange', 'translate']
  const totalActivities     = activityFlags.filter(Boolean).length
  const completedActivities = activityKeys.filter((k, i) => activityFlags[i] && (starsMap[k] ?? 0) > 0).length
  const progressPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0

  const coreCards: CoreCardProps[] = [
    {
      href: `/learn/${slug}/vocabulary`,
      icon: BookOpen,
      variant: 'vocabulary',
      label: 'Vocabulary',
      total: vocabItems.length,
      unit: 'words',
      mastered: masteredWords,
      stars: starsMap['vocabulary'] ?? 0,
      available: hasVocab,
    },
    {
      href: `/learn/${slug}/phrases`,
      icon: MessageSquare,
      variant: 'phrases',
      label: 'Phrases',
      total: phraseItems.length,
      unit: 'phrases',
      mastered: masteredPhrases,
      stars: starsMap['phrases'] ?? 0,
      available: hasPhrases,
    },
    {
      href: `/learn/${slug}/qa`,
      icon: HelpCircle,
      variant: 'qa',
      label: 'Q&A Quiz',
      total: qaItems.length,
      unit: 'questions',
      mastered: masteredQA,
      stars: starsMap['qa'] ?? 0,
      available: hasQA,
    },
    {
      href: `/learn/${slug}/story`,
      icon: BookMarked,
      variant: 'story',
      label: 'Story',
      total: storyText ? storyText.split(/\s+/).filter(Boolean).length : 0,
      unit: 'words',
      mastered: 0,
      stars: starsMap['story'] ?? 0,
      available: hasStory,
    },
  ]

  const availableCoreCards = coreCards.filter(c => c.available)

  return (
    <motion.div
      initial="initial"
      animate="animate"
      transition={{ staggerChildren: 0.05 }}
      className="flex flex-col gap-3 md:gap-4"
    >

      {/* ══════════════════════════════════════════════════════════════════════
          HERO CARD — full width, module info + 4 core activities inside
      ══════════════════════════════════════════════════════════════════════ */}
      <Block className="col-span-12 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">

        {/* Top: module info */}
        <div className="relative p-6 md:p-8 pb-5 md:pb-6">
          {/* Emoji watermark */}
          <div className="absolute right-0 top-0 bottom-0 w-40 md:w-56 flex items-center justify-end overflow-hidden pointer-events-none select-none">
            <span className="text-[8rem] md:text-[10rem] leading-none opacity-[0.06] dark:opacity-[0.05] translate-x-6 md:translate-x-10">
              {icon}
            </span>
          </div>

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
                  {languageCode?.toUpperCase()} · {exerciseCount} activities
                </span>
                <h1 className="text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white mb-1">
                  {title}
                </h1>
                {description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
                )}
              </div>

              {/* Crown Challenge — the module's end goal, pinned beside the title */}
              <div className="w-full md:w-[30%] md:shrink-0">
                <CrownBand
                  slug={slug}
                  allThreeStars={allThreeStars}
                  hasCrown={hasCrown}
                  starsMap={starsMap}
                  hasVocab={hasVocab}
                  hasPhrases={hasPhrases}
                  hasQA={hasQA}
                  hasStory={hasStory}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 md:justify-end">
              {/* Progress */}
              <div className="min-w-[140px]">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span>{completedActivities}/{totalActivities}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
                  />
                </div>
              </div>

              {firstExType && (
                <Link href={`/learn/${slug}/${firstExType}`}>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm shadow-primary/30 shrink-0"
                  >
                    <PlayCircle size={15} />
                    {progressPct > 0 ? 'Continue' : 'Start'}
                  </motion.button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 md:mx-8 h-px bg-black/[0.04] dark:bg-white/[0.05]" />

        {/* Bottom: 4 core activity cards — these are the essential, non-optional work */}
        <div className="p-4 md:p-6 pb-5">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Essential</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">— master all 4 to unlock the Crown Challenge</span>
          </div>
          <div className={cn(
            'grid gap-3',
            availableCoreCards.length === 4 ? 'grid-cols-2 md:grid-cols-4'
            : availableCoreCards.length === 3 ? 'grid-cols-3'
            : availableCoreCards.length === 2 ? 'grid-cols-2'
            : 'grid-cols-1'
          )}>
            {availableCoreCards.map(card => (
              <CoreCard key={card.href} {...card} />
            ))}
          </div>
        </div>

      </Block>

      {/* ══════════════════════════════════════════════════════════════════════
          MINI CARDS ROW — all in one horizontal line
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Bonus Practice</span>
          <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600">— optional extra reps</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        <MiniCard
          href={`/learn/${slug}/flashcards`}
          icon={Layers}
          label="Flashcards"
          bg="bg-[#ff8052]"
          stars={starsMap['vocabulary']}
          tilt="2.5deg"
        />

        {hasArrange && (
          <MiniCard
            href={`/learn/${slug}/arrange`}
            icon={Shuffle}
            label="Arrange"
            bg="bg-teal-500"
            stars={starsMap['arrange']}
            tilt="-2.5deg"
          />
        )}

        <MiniCard
          href="/play"
          icon={Zap}
          label="Speed Round"
          bg="bg-orange-500"
          tilt="2.5deg"
        />

        <MiniCard
          href="/play"
          icon={Shuffle}
          label="Scramble"
          bg="bg-indigo-500"
          tilt="-2.5deg"
        />

        <MiniCard
          href="/play"
          icon={Headphones}
          label="Listen"
          bg="bg-violet-600"
          tilt="2.5deg"
        />

        <MiniCard
          href="/play"
          icon={PenLine}
          label="Fill Blank"
          bg="bg-emerald-600"
          tilt="-2.5deg"
        />

        {hasTranslate && (
          <MiniCard
            href={`/learn/${slug}/translate`}
            icon={PenLine}
            label="Translate"
            bg="bg-rose-500"
            stars={starsMap['translate']}
            tilt="2.5deg"
          />
        )}

        </div>
      </div>

    </motion.div>
  )
}
