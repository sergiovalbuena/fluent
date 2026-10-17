'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, MessageSquare, HelpCircle,
  BookMarked, Shuffle, Zap, Headphones,
  PlayCircle, Layers, Star, Crown, Lock, ChevronRight,
  GraduationCap, Lightbulb, Volume2, FileText, ListOrdered, Languages, TextCursorInput, Gem, PencilRuler,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { speak } from '@/lib/languages'
import { HINT_AREA, SectionTitle, TitleHintProvider } from '@/components/lesson/title-hint'
import { useTitleHintSettings } from '@/lib/title-hints'
import type { SectionTitleKey } from '@/lib/section-titles'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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
/** A grammar structure used in the lesson; label is in the translation language */
export type GrammarItem = { structure: string; example: string; label: string }

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
  grammarItems?: GrammarItem[]
  tips?: string[]
  /** Lesson number on the path (modules.order_index) */
  orderIndex?: number
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

type CountKey = 'ov_count_words' | 'ov_count_phrases' | 'ov_count_questions'

interface CoreCardProps {
  href: string
  icon: React.ElementType
  variant: ActivityVariant
  titleKey: SectionTitleKey
  total: number
  countKey: CountKey
  mastered: number
  stars: number
  available: boolean
}

function CoreCard({ href, icon: Icon, variant, titleKey, total, countKey, mastered, stars, available }: CoreCardProps) {
  const tLesson = useTranslations('lesson')
  if (!available) return null
  const t = VARIANT_TOKENS[variant]
  const count = tLesson(countKey, { count: total })

  return (
    <Link href={href} className="block group h-full">
      <motion.div
        {...HINT_AREA}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none cursor-pointer"
      >
        {/* Top accent bar */}
        <div className={cn('h-[3px] w-full shrink-0', t.bar)} />

        <div className="flex flex-col flex-1 gap-3 p-4">
          {/* Title + stars — same level */}
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-base text-slate-900 dark:text-white leading-snug"><SectionTitle k={titleKey} /></p>
            <StarsRow stars={stars} size={15} />
          </div>

          {/* Icon + count — bigger, the card's focal point */}
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className={cn('size-12 rounded-xl flex items-center justify-center shrink-0', t.iconBg)}>
              <Icon size={22} className={t.iconColor} />
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {mastered > 0
                ? <><span className="text-primary font-bold">{mastered}</span><span className="text-slate-400 dark:text-slate-500"> / {count}</span></>
                : <span className="text-slate-400 dark:text-slate-500">{count}</span>
              }
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Mini activity card (bottom row) ──────────────────────────────────────────
// ── Bonus practice cards ───────────────────────────────────────────────────────
// One surface for every card (white, like the core cards); the icon chip carries
// the color, following the activity colors above. Only cards that need action
// (exercises, games) show rewards; reading material (grammar, tips) doesn't.

type BonusCardContent = {
  icon: React.ElementType
  iconClass: string
  iconBgClass: string
  title: React.ReactNode
  sublabel: string
  /** Rewards the activity gives; omitted for reading material */
  rewards?: Rewards
}

/**
 * What an activity can earn. stars: earns a 1–3 star rating (value = current
 * stars); xp / gems: the most it can give in one run.
 */
type Rewards = { stars?: number; xp?: number; gems?: number }

/** "+15 XP" and gem chips, in the topbar's gem color */
function RewardChips({ xp, gems }: Rewards) {
  if (!xp && !gems) return null
  return (
    <span className="flex items-center gap-1.5">
      {xp ? (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">+{xp} XP</span>
      ) : null}
      {gems ? (
        <span className="flex items-center gap-0.5 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
          <Gem size={10} />+{gems}
        </span>
      ) : null}
    </span>
  )
}

const BONUS_SURFACE = 'h-full rounded-3xl border bg-white dark:bg-[#202638] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]'

function bonusMotion() {
  return {
    whileHover: { y: -3 },
    whileTap: { scale: 0.97 },
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  }
}

function BonusCardBody({ icon: Icon, iconClass, iconBgClass, title, sublabel, rewards }: BonusCardContent) {
  return (
    <span className="relative flex h-full min-h-[116px] flex-col justify-between gap-3 p-4 md:p-5 text-left">
      <span className="flex items-start justify-between gap-2">
        <span className={cn('size-10 shrink-0 rounded-xl flex items-center justify-center', iconBgClass)}>
          <Icon size={19} className={iconClass} />
        </span>
        {rewards?.stars !== undefined && <StarsRow stars={rewards.stars} size={12} />}
      </span>
      <span>
        <span className="block text-sm font-bold leading-tight text-slate-900 dark:text-white">{title}</span>
        <span className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
          {rewards && <RewardChips {...rewards} />}
        </span>
      </span>
    </span>
  )
}

function BonusCard({ href, ...content }: BonusCardContent & { href: string }) {
  return (
    <Link href={href} className="block">
      <motion.div
        {...bonusMotion()}
        className={cn(BONUS_SURFACE, 'border-black/[0.04] dark:border-white/[0.05]')}
      >
        <BonusCardBody {...content} />
      </motion.div>
    </Link>
  )
}

/** Bonus card that opens its content (grammar, tips) in a dialog */
function InfoDialogCard({ titleKey, children, ...content }: Omit<BonusCardContent, 'title'> & {
  titleKey: SectionTitleKey
  children: React.ReactNode
}) {
  const Icon = content.icon
  return (
    <Dialog>
      <motion.div
        {...HINT_AREA}
        {...bonusMotion()}
        className={cn(BONUS_SURFACE, 'border-black/[0.04] dark:border-white/[0.05]')}
      >
        <DialogTrigger className="block h-full w-full cursor-pointer">
          <BonusCardBody {...content} title={<SectionTitle k={titleKey} />} />
        </DialogTrigger>
      </motion.div>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="flex-row items-center gap-2.5 px-5 pt-5 pr-12">
          <span className={cn('size-8 shrink-0 rounded-lg flex items-center justify-center', content.iconBgClass)}>
            <Icon size={16} className={content.iconClass} />
          </span>
          <div>
            <DialogTitle className="font-bold"><SectionTitle k={titleKey} /></DialogTitle>
            <DialogDescription className="text-xs">{content.sublabel}</DialogDescription>
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** An activity that isn't built yet */
function ComingSoonCard({ icon: Icon, iconClass, iconBgClass, title, sublabel }: Omit<BonusCardContent, 'rewards'>) {
  return (
    <div className={cn(BONUS_SURFACE, 'border-dashed border-black/[0.08] dark:border-white/[0.1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]')}>
      <span className="relative flex h-full min-h-[116px] flex-col justify-between gap-3 p-4 md:p-5">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('size-10 shrink-0 rounded-xl flex items-center justify-center opacity-70', iconBgClass)}>
            <Icon size={19} className={iconClass} />
          </span>
          <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coming soon</span>
        </span>
        <span>
          <span className="block text-sm font-bold leading-tight text-slate-500 dark:text-slate-400">{title}</span>
          <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1">{sublabel}</span>
        </span>
      </span>
    </div>
  )
}

/** Compact card for a general mini-game (not tied to this lesson) */
function GameCard({ href, icon: Icon, label, rewards }: { href: string; icon: React.ElementType; label: string; rewards: Rewards }) {
  return (
    <Link href={href} className="block">
      <motion.div
        {...bonusMotion()}
        className="flex items-center gap-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] px-3.5 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_6px_16px_rgba(0,0,0,0.07)]"
      >
        <span className="size-8 shrink-0 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
          <Icon size={16} className="text-slate-600 dark:text-slate-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
          <span className="mt-1 block"><RewardChips {...rewards} /></span>
        </span>
      </motion.div>
    </Link>
  )
}

/** Mini-games in /play give up to 15 XP and 3 gems per round */
const GAME_REWARDS: Rewards = { xp: 15, gems: 3 }

function GroupLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2 px-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>
    </div>
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
    grammarItems = [],
    tips = [],
    orderIndex,
  } = data

  // Section titles (Grammar, Tips) follow the lesson's title-hint setting
  const uiLocale = useLocale()
  const titleHints = useTitleHintSettings()
  const titleHintSettings = {
    lang: languageCode ?? 'en',
    hintLang: uiLocale,
    active: titleHints.enabled && orderIndex != null && orderIndex <= titleHints.untilLesson,
  }

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
      titleKey: 'vocabulary',
      total: vocabItems.length,
      countKey: 'ov_count_words',
      mastered: masteredWords,
      stars: starsMap['vocabulary'] ?? 0,
      available: hasVocab,
    },
    {
      href: `/learn/${slug}/phrases`,
      icon: MessageSquare,
      variant: 'phrases',
      titleKey: 'phrases',
      total: phraseItems.length,
      countKey: 'ov_count_phrases',
      mastered: masteredPhrases,
      stars: starsMap['phrases'] ?? 0,
      available: hasPhrases,
    },
    {
      href: `/learn/${slug}/qa`,
      icon: HelpCircle,
      variant: 'qa',
      titleKey: 'qa',
      total: qaItems.length,
      countKey: 'ov_count_questions',
      mastered: masteredQA,
      stars: starsMap['qa'] ?? 0,
      available: hasQA,
    },
    {
      href: `/learn/${slug}/story`,
      icon: BookMarked,
      variant: 'story',
      titleKey: 'story',
      total: storyText ? storyText.split(/\s+/).filter(Boolean).length : 0,
      countKey: 'ov_count_words',
      mastered: 0,
      stars: starsMap['story'] ?? 0,
      available: hasStory,
    },
  ]

  const availableCoreCards = coreCards.filter(c => c.available)

  return (
    <TitleHintProvider value={titleHintSettings}>
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
          BONUS PRACTICE — review material, lesson exercises, general mini-games
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-5 mt-1">

        {/* Review — this lesson's material (all from the vocabulary lesson: indigo) */}
        {(hasVocab || grammarItems.length > 0 || tips.length > 0) && (
          <div>
            <GroupLabel label="Review" hint="this lesson's material" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {grammarItems.length > 0 && (
                <InfoDialogCard
                  titleKey="grammar"
                  icon={GraduationCap}
                  iconClass="text-indigo-500"
                  iconBgClass="bg-indigo-500/10"
                  sublabel={`${grammarItems.length} ${grammarItems.length === 1 ? 'structure' : 'structures'}`}
                >
                  <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.05] pb-2">
                    {grammarItems.map((g, i) => (
                      <li key={i} className="px-5 py-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{g.label}</p>
                        <p className="text-[11px] text-indigo-500 mt-0.5">{g.structure}</p>
                        <button
                          type="button"
                          onClick={() => speak(g.example, languageCode ?? 'en')}
                          className="mt-1.5 flex items-start gap-1.5 text-left text-sm italic text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                          <Volume2 size={13} className="shrink-0 mt-[3px]" />
                          {g.example}
                        </button>
                      </li>
                    ))}
                  </ul>
                </InfoDialogCard>
              )}
              {tips.length > 0 && (
                <InfoDialogCard
                  titleKey="tips"
                  icon={Lightbulb}
                  iconClass="text-indigo-500"
                  iconBgClass="bg-indigo-500/10"
                  sublabel={`${tips.length} ${tips.length === 1 ? 'tip' : 'tips'}`}
                >
                  <ul className="px-5 pt-2 pb-5 space-y-2.5">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-indigo-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </InfoDialogCard>
              )}
              {hasVocab && (
                <BonusCard href={`/learn/${slug}/words`} icon={FileText} iconClass="text-indigo-500" iconBgClass="bg-indigo-500/10" title="Word sheet" sublabel="Every word on one page" />
              )}
              {hasVocab && (
                <BonusCard href={`/learn/${slug}/flashcards`} icon={Layers} iconClass="text-indigo-500" iconBgClass="bg-indigo-500/10" title="Flashcards" sublabel="Flip & review" />
              )}
            </div>
          </div>
        )}

        {/* Practice — this lesson's extra exercises; the first one not started is recommended */}
        {(hasArrange || hasTranslate || grammarItems.length > 0) && (
          <div>
            <GroupLabel label="Practice" hint="extra exercises · earn stars and gems" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {hasArrange && (
                <BonusCard
                  href={`/learn/${slug}/arrange`}
                  icon={ListOrdered}
                  iconClass="text-primary"
                  iconBgClass="bg-primary/10"
                  title="Arrange"
                  sublabel={`${arrangeCount} sentences`}
                  rewards={{ stars: starsMap['arrange'] ?? 0, gems: 2 }}
                />
              )}
              {hasTranslate && (
                <BonusCard
                  href={`/learn/${slug}/translate`}
                  icon={Languages}
                  iconClass="text-primary"
                  iconBgClass="bg-primary/10"
                  title="Translate"
                  sublabel={`${translateCount} sentences`}
                  rewards={{ stars: starsMap['translate'] ?? 0, gems: 2 }}
                />
              )}
              {grammarItems.length > 0 && (
                <ComingSoonCard
                  icon={PencilRuler}
                  iconClass="text-indigo-500"
                  iconBgClass="bg-indigo-500/10"
                  title="Grammar practice"
                  sublabel="Use this lesson's structures"
                />
              )}
            </div>
          </div>
        )}

        {/* Mini-games — general, not tied to this lesson */}
        <div>
          <GroupLabel label="Mini-games" hint="general practice, all lessons" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GameCard href="/play/speedround" icon={Zap} label="Speed Round" rewards={GAME_REWARDS} />
            <GameCard href="/play/wordscramble" icon={Shuffle} label="Scramble" rewards={GAME_REWARDS} />
            <GameCard href="/play/listening" icon={Headphones} label="Listen" rewards={GAME_REWARDS} />
            <GameCard href="/play/filltheblank" icon={TextCursorInput} label="Fill Blank" rewards={GAME_REWARDS} />
          </div>
        </div>

      </div>

    </motion.div>
    </TitleHintProvider>
  )
}
