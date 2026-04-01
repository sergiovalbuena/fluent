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
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#2c1a12]',
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
        className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#2c1a12] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none cursor-pointer"
      >
        {/* Top accent bar */}
        <div className={cn('h-[3px] w-full shrink-0', t.bar)} />

        <div className="flex flex-col flex-1 gap-3 p-4">
          {/* Icon (left) + stars + count (right) */}
          <div className="flex items-start justify-between gap-2">
            <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', t.iconBg)}>
              <Icon size={18} className={t.iconColor} />
            </div>
            <div className="flex flex-col items-end gap-1 pt-0.5">
              <StarsRow stars={stars} size={15} />
              <p className="text-[11px] font-semibold tabular-nums">
                {mastered > 0
                  ? <><span className="text-primary font-bold">{mastered}</span><span className="text-slate-400 dark:text-slate-500"> / {total} {unit}</span></>
                  : <span className="text-slate-400 dark:text-slate-500">{total} {unit}</span>
                }
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="flex-1 flex items-end">
            <p className="font-bold text-[13px] text-slate-900 dark:text-white leading-snug">{label}</p>
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

// ── Crown Challenge band (inside Hero, full width) ────────────────────────────
// Three states: locked → unlocked → crowned
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
  const threeStarCount = activeCore.filter(a => (starsMap[a.key] ?? 0) >= 3).length
  const totalCore = activeCore.length
  const progressPct = totalCore > 0 ? Math.round((threeStarCount / totalCore) * 100) : 0

  // ── CROWNED ──────────────────────────────────────────────────────────────
  if (hasCrown) {
    return (
      <div className="relative overflow-hidden rounded-b-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: 'cover' }}
        />
        {/* Large crown watermark */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.18]">
          <Crown size={72} className="text-white" />
        </div>
        <div className="relative flex items-center gap-4 px-6 md:px-8 py-5">
          <div className="size-12 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
            <Crown size={22} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-base text-white leading-tight">Module Mastered</p>
            <p className="text-[12px] text-white/70 mt-1">You can use this in real life · Crown earned</p>
          </div>
        </div>
      </div>
    )
  }

  // ── UNLOCKED — all ⭐⭐⭐, ready to challenge ──────────────────────────────
  if (allThreeStars) {
    return (
      <Link href={`/learn/${slug}/mastery`} className="block group">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="relative overflow-hidden rounded-b-3xl"
        >
          {/* Deep gold gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600" />
          {/* Shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
          {/* Crown watermark — large, atmospheric */}
          <motion.div
            animate={{ opacity: [0.12, 0.2, 0.12], scale: [1, 1.04, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none"
          >
            <Crown size={88} className="text-white" />
          </motion.div>
          <div className="relative flex items-center justify-between px-6 md:px-8 py-5 md:py-6">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 20px rgba(251,191,36,0.6)', '0 0 0px rgba(251,191,36,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="size-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"
              >
                <Crown size={22} className="text-white" />
              </motion.div>
              <div>
                <p className="font-black text-base text-white leading-tight tracking-tight">Crown Challenge</p>
                <p className="text-[12px] text-white/80 mt-0.5 font-medium">All ⭐⭐⭐ earned — you're ready for the ultimate test</p>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-white text-amber-600 font-black text-[12px] px-4 py-2 rounded-xl shrink-0 shadow-lg shadow-amber-900/30"
            >
              Begin <ChevronRight size={13} />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    )
  }

  // ── LOCKED — the main state, needs the most craft ─────────────────────────
  // Dark atmospheric band: creates desire by showing the prize behind a barrier
  // Progress bar: the primary motivator — shows exactly how close they are
  // Activity pills: shows which specific activities still need work
  return (
    <div className="relative overflow-hidden rounded-b-3xl">
      {/* Dark warm background — atmospheric, mysterious */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c0a05] via-[#230e07] to-[#1a0803]" />
      {/* Subtle warm vignette from center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,rgba(255,128,82,0.07),transparent_70%)]" />
      {/* Crown watermark — dimly visible, creates desire */}
      <motion.div
        animate={{ opacity: [0.07, 0.13, 0.07] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none"
      >
        <Crown size={96} className="text-amber-400" />
      </motion.div>

      <div className="relative px-6 md:px-8 py-5 md:py-6 flex flex-col gap-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
              <Lock size={16} className="text-white/50" />
            </div>
            <div>
              <p className="font-black text-[14px] text-white/90 leading-tight tracking-tight">Crown Challenge</p>
              <p className="text-[11px] text-white/45 mt-0.5 font-medium">
                Master all activities to unlock the ultimate test
              </p>
            </div>
          </div>
          {/* Progress fraction */}
          <div className="text-right shrink-0">
            <span className="text-[11px] font-bold text-white/40 tabular-nums">{threeStarCount}<span className="text-white/25">/{totalCore}</span></span>
          </div>
        </div>

        {/* Progress bar — the main motivator */}
        <div className="flex flex-col gap-2">
          <div className="h-[5px] w-full rounded-full bg-white/[0.08] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            />
          </div>

          {/* Activity pills — stars per activity */}
          <div className="flex items-center gap-2">
            {activeCore.map(a => {
              const s = starsMap[a.key] ?? 0
              const done = s >= 3
              return (
                <div
                  key={a.key}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors',
                    done
                      ? 'bg-amber-500/[0.18] border border-amber-500/25'
                      : 'bg-white/[0.06] border border-white/[0.06]'
                  )}
                >
                  <span className={cn('text-[10px] font-bold', done ? 'text-amber-400' : 'text-white/40')}>
                    {a.label}
                  </span>
                  <div className="flex items-center gap-[2px]">
                    {[1, 2, 3].map(n => (
                      <Star
                        key={n}
                        size={8}
                        className={
                          n <= s
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-white/15 text-white/15'
                        }
                      />
                    ))}
                  </div>
                </div>
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

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
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

            <div className="flex items-center gap-4 shrink-0">
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

        {/* Bottom: 4 core activity cards */}
        <div className="p-4 md:p-6 pb-4">
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

        {/* Crown Challenge — integrated at the bottom of the hero */}
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

      </Block>

      {/* ══════════════════════════════════════════════════════════════════════
          MINI CARDS ROW — all in one horizontal line
      ══════════════════════════════════════════════════════════════════════ */}
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

    </motion.div>
  )
}
