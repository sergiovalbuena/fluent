'use client'

import React from 'react'
import { motion, type MotionProps, type Variants } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, MessageSquare, HelpCircle,
  BookMarked,
  PlayCircle, Layers, Star, Crown, Lock, ChevronRight,
  GraduationCap, Lightbulb, Volume2, FileText, ListOrdered, Languages, Gem, PencilRuler,
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

// ── Lesson bento (review, practice) ────────────────────────────────
// One 12-column grid with cards of different sizes. Color tells the group:
// indigo = review material (no rewards), orange = this lesson's exercises
// (stars + gems). Each card's content reacts on hover through the shared
// "hover" variant.

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

const bentoCard: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  hover: { y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } },
}
const pop = { type: 'spring', stiffness: 380, damping: 18 } as const

const SURFACE = 'relative h-full overflow-hidden rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_10px_24px_rgba(0,0,0,0.09)]'

type Group = 'review' | 'practice'
const GROUP_LABEL: Record<Group, string> = { review: 'Review', practice: 'Practice' }

function GroupTag({ group }: { group: Group }) {
  return (
    <span className={cn(
      'text-[9px] font-black uppercase tracking-widest',
      group === 'review' ? 'text-indigo-400' : 'text-primary/70',
    )}>
      {GROUP_LABEL[group]}
    </span>
  )
}

/** Icon chip that bounces on card hover */
function BentoIcon({ icon: Icon, className }: { icon: React.ElementType; className: string }) {
  return (
    <motion.span
      variants={{ animate: { rotate: 0, scale: 1 }, hover: { rotate: [0, -12, 8, 0], scale: 1.1, transition: { duration: 0.45 } } }}
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', className)}
    >
      <Icon size={19} />
    </motion.span>
  )
}

/** Card frame: a link or a dialog trigger, with the bento motion */
function BentoLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('group block rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-primary/30', className)}>
      <motion.div variants={bentoCard} whileHover="hover" whileTap={{ scale: 0.98 }} className="h-full">
        {children}
      </motion.div>
    </Link>
  )
}

/** Grammar / tips: preview on the card, everything in a dialog */
function BentoDialogCard({ className, titleKey, icon: Icon, sublabel, preview, children, big }: {
  className: string
  titleKey: SectionTitleKey
  icon: React.ElementType
  sublabel: string
  preview: React.ReactNode
  children: React.ReactNode
  big?: boolean
}) {
  return (
    <Dialog>
      <motion.div variants={bentoCard} whileHover="hover" className={cn('rounded-3xl', className)} {...HINT_AREA}>
        <DialogTrigger className={cn(SURFACE, 'block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30')}>
          {big ? (
            <span className="flex h-full flex-col gap-3 p-5 md:p-6">
              <span className="flex items-start justify-between gap-2">
                <BentoIcon icon={Icon} className="bg-indigo-500/10 text-indigo-500" />
                <GroupTag group="review" />
              </span>
              <span>
                <span className="block text-lg font-bold leading-tight text-slate-900 dark:text-white"><SectionTitle k={titleKey} /></span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
              </span>
              <span className="block min-h-0 flex-1">{preview}</span>
            </span>
          ) : (
            // Compact: icon beside the title so the preview fits one bento row
            <span className="flex h-full flex-col justify-between gap-2 p-4 md:p-5">
              <span className="flex items-center gap-3">
                <BentoIcon icon={Icon} className="bg-indigo-500/10 text-indigo-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight text-slate-900 dark:text-white"><SectionTitle k={titleKey} /></span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
                </span>
                <GroupTag group="review" />
              </span>
              <span className="block">{preview}</span>
            </span>
          )}
        </DialogTrigger>
      </motion.div>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="flex-row items-center gap-2.5 px-5 pt-5 pr-12">
          <span className="size-8 shrink-0 rounded-lg flex items-center justify-center bg-indigo-500/10">
            <Icon size={16} className="text-indigo-500" />
          </span>
          <div>
            <DialogTitle className="font-bold"><SectionTitle k={titleKey} /></DialogTitle>
            <DialogDescription className="text-xs">{sublabel}</DialogDescription>
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** White card for review material and lesson exercises */
function BentoTile({ group, icon, iconClass, title, sublabel, rewards, art, className, href }: {
  group: Group
  icon: React.ElementType
  iconClass: string
  title: string
  sublabel: string
  rewards?: Rewards
  art?: React.ReactNode
  className: string
  href: string
}) {
  return (
    <BentoLink href={href} className={className}>
      <div className={SURFACE}>
        {art && <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] items-center justify-center sm:flex">{art}</div>}
        <div className="relative flex h-full flex-col justify-between gap-3 p-4 md:p-5">
          <span className="flex items-start justify-between gap-2">
            <BentoIcon icon={icon} className={iconClass} />
            {rewards?.stars !== undefined ? <StarsRow stars={rewards.stars} size={12} /> : <GroupTag group={group} />}
          </span>
          <span>
            <span className="block text-sm font-bold leading-tight text-slate-900 dark:text-white">{title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
              {rewards && <RewardChips {...rewards} />}
            </span>
          </span>
        </div>
      </div>
    </BentoLink>
  )
}

/** Planned activity: dashed, not clickable */
function BentoComingSoon({ icon: Icon, title, sublabel, className }: { icon: React.ElementType; title: string; sublabel: string; className: string }) {
  return (
    <motion.div variants={bentoCard} className={cn('rounded-3xl border-2 border-dashed border-black/[0.08] dark:border-white/[0.1] p-4 md:p-5 flex flex-col justify-between gap-3', className)}>
      <span className="flex items-start justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><Icon size={19} /></span>
        <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coming soon</span>
      </span>
      <span>
        <span className="block text-sm font-bold leading-tight text-slate-500 dark:text-slate-400">{title}</span>
        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{sublabel}</span>
      </span>
    </motion.div>
  )
}

// ── Hover art ──────────────────────────────────────────────────────────────────

/** Arrange: shuffled word chips fall into order */
function ArrangeArt({ words }: { words: string[] }) {
  const order = [2, 0, 1]
  return (
    <span className="relative flex flex-col items-end gap-1.5 pr-4">
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
          variants={{
            animate: { y: (order[i] - i) * 30, rotate: (i - 1) * 6 },
            hover: { y: 0, rotate: 0, transition: { ...pop, delay: i * 0.05 } },
          }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  )
}

/** Translate: the phrase swaps languages */
function TranslateArt({ from, to }: { from: string; to: string }) {
  return (
    <span className="relative mr-4 grid h-9 w-28 place-items-center overflow-hidden rounded-xl bg-primary/10 text-xs font-bold text-primary">
      <motion.span className="absolute max-w-full truncate px-2" variants={{ animate: { y: 0, opacity: 1 }, hover: { y: -24, opacity: 0, transition: { duration: 0.25 } } }}>{from}</motion.span>
      <motion.span className="absolute max-w-full truncate px-2" style={{ y: 24, opacity: 0 }} variants={{ animate: { y: 24, opacity: 0 }, hover: { y: 0, opacity: 1, transition: { ...pop, delay: 0.1 } } }}>{to}</motion.span>
    </span>
  )
}

/** Flashcards: the first word flips to its translation */
function FlipArt({ front, back }: { front: string; back: string }) {
  return (
    <span className="mr-4 [perspective:600px]">
      <motion.span
        className="relative block h-14 w-24 [transform-style:preserve-3d]"
        variants={{ animate: { rotateY: 0 }, hover: { rotateY: 180, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}
      >
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-500 px-2 text-center text-[11px] font-bold leading-tight text-white shadow-md [backface-visibility:hidden]">{front}</span>
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-100 px-2 text-center text-[11px] font-bold leading-tight text-indigo-700 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-indigo-900 dark:text-indigo-200">{back}</span>
      </motion.span>
    </span>
  )
}

/** Word sheet: a page whose lines fill in */
function SheetArt() {
  return (
    <span className="mr-4 block w-20 rounded-lg bg-indigo-500/[0.07] p-2.5 ring-1 ring-indigo-500/10">
      {[1, 0.7, 0.9, 0.55].map((w, i) => (
        <motion.span
          key={i}
          className="mb-1.5 block h-1.5 rounded-full bg-indigo-400/60 last:mb-0"
          variants={{ animate: { width: '25%' }, hover: { width: `${w * 100}%`, transition: { duration: 0.35, delay: i * 0.06 } } }}
        />
      ))}
    </span>
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
          BONUS BENTO — this lesson's review material and extra exercises.
          Desktop rows: grammar 5×2 + arrange 4 + translate 3 · flashcards 3 +
          word sheet 4 · tips 7 + grammar practice 5
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="mt-1">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Bonus</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="size-2 rounded-full bg-indigo-500" /> review</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="size-2 rounded-full bg-primary" /> practice · stars & gems</span>
        </div>

        <div className="grid grid-flow-dense grid-cols-12 auto-rows-[minmax(124px,auto)] md:auto-rows-[136px] gap-3">
          {grammarItems.length > 0 && (
            <BentoDialogCard
              big
              className="col-span-12 md:col-span-5 md:row-span-2"
              titleKey="grammar"
              icon={GraduationCap}
              sublabel={`${grammarItems.length} ${grammarItems.length === 1 ? 'structure' : 'structures'}`}
              preview={
                <span className="flex flex-col gap-2">
                  {grammarItems.slice(0, 2).map((g, i) => (
                    <motion.span
                      key={i}
                      variants={{ animate: { x: 0 }, hover: { x: 4, transition: { ...pop, delay: i * 0.05 } } }}
                      className="block rounded-xl bg-indigo-500/[0.06] px-3 py-2"
                    >
                      <span className="block truncate text-[11px] font-semibold text-indigo-500">{g.structure}</span>
                      <span className="block truncate text-sm italic text-slate-700 dark:text-slate-200">{g.example}</span>
                    </motion.span>
                  ))}
                  {grammarItems.length > 2 && <span className="px-1 text-[11px] font-semibold text-indigo-400">+{grammarItems.length - 2} more</span>}
                </span>
              }
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
            </BentoDialogCard>
          )}

          {hasArrange && (
            <BentoTile
              href={`/learn/${slug}/arrange`}
              className="col-span-6 md:col-span-4"
              group="practice"
              icon={ListOrdered}
              iconClass="bg-primary/10 text-primary"
              title="Arrange"
              sublabel={`${arrangeCount} sentences`}
              rewards={{ stars: starsMap['arrange'] ?? 0, gems: 2 }}
              art={<ArrangeArt words={['je', 'suis', 'ici']} />}
            />
          )}
          {hasTranslate && (
            <BentoTile
              href={`/learn/${slug}/translate`}
              className="col-span-6 md:col-span-3"
              group="practice"
              icon={Languages}
              iconClass="bg-primary/10 text-primary"
              title="Translate"
              sublabel={`${translateCount} sentences`}
              rewards={{ stars: starsMap['translate'] ?? 0, gems: 2 }}
              art={phraseItems[0] ? <TranslateArt from={phraseItems[0].phrase} to={phraseItems[0].translation} /> : undefined}
            />
          )}
          {hasVocab && (
            <BentoTile
              href={`/learn/${slug}/flashcards`}
              className="col-span-6 md:col-span-3"
              group="review"
              icon={Layers}
              iconClass="bg-indigo-500/10 text-indigo-500"
              title="Flashcards"
              sublabel="Flip & review"
              art={vocabItems[0] ? <FlipArt front={vocabItems[0].word} back={vocabItems[0].translation} /> : undefined}
            />
          )}
          {hasVocab && (
            <BentoTile
              href={`/learn/${slug}/words`}
              className="col-span-6 md:col-span-4"
              group="review"
              icon={FileText}
              iconClass="bg-indigo-500/10 text-indigo-500"
              title="Word sheet"
              sublabel="Every word on one page"
              art={<SheetArt />}
            />
          )}

          {tips.length > 0 && (
            <BentoDialogCard
              className="col-span-12 sm:col-span-6 md:col-span-7"
              titleKey="tips"
              icon={Lightbulb}
              sublabel={`${tips.length} ${tips.length === 1 ? 'tip' : 'tips'}`}
              preview={<span className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">💡 {tips[0]}</span>}
            >
              <ul className="px-5 pt-2 pb-5 space-y-2.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-indigo-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </BentoDialogCard>
          )}
          {grammarItems.length > 0 && (
            <BentoComingSoon
              className="col-span-12 sm:col-span-6 md:col-span-5"
              icon={PencilRuler}
              title="Grammar practice"
              sublabel="Use this lesson's structures"
            />
          )}

        </div>
      </div>

    </motion.div>
    </TitleHintProvider>
  )
}
