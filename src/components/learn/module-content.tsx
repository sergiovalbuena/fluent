'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, MessageSquare, HelpCircle,
  BookMarked, Shuffle, PenLine, Zap, Headphones, Gem, Bot,
  PlayCircle, Layers, Star, Crown, Lock,
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
    whileTap={{ scale: 0.97 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#2c1a12]',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

// ── Stars mini row ─────────────────────────────────────────────────────────────
function StarsRow({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          size={12}
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

// ── Neutral activity card (unified design) ────────────────────────────────────
// Icon top-left, arrow top-right (hover), title + subtitle, optional micro-preview
interface ActivityCardProps {
  href: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  stars?: number
  preview?: React.ReactNode
}

const ActivityCard = ({ href, icon: Icon, iconBg, iconColor, title, subtitle, stars, preview }: ActivityCardProps) => (
  <Link href={href} className="block h-full">
    <div className="flex flex-col h-full gap-3 group">
      <div className="flex items-start justify-between">
        <div className={cn('size-10 rounded-2xl flex items-center justify-center', iconBg)}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stars !== undefined && <StarsRow stars={stars} />}
          <div className={cn('size-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity', iconBg)}>
            <ArrowRight size={13} className={iconColor} />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-slate-900 dark:text-white">{title}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {preview && <div className="mt-auto">{preview}</div>}
    </div>
  </Link>
)

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
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ModuleContentView({ data }: { data: ModuleContentData }) {
  const {
    slug, title, description, icon, languageCode, exerciseCount, firstExType,
    vocabItems, phraseItems, qaItems, storyText,
    arrangeCount, translateCount,
    hasVocab, hasPhrases, hasQA, hasStory, hasArrange, hasTranslate,
    starsMap = {},
    allThreeStars = false,
    hasCrown = false,
  } = data

  // ── Module progress calculation ───────────────────────────────────────────
  const activityFlags = [hasVocab, hasPhrases, hasQA, hasStory, hasArrange, hasTranslate]
  const activityKeys  = ['vocabulary', 'phrases', 'qa', 'story', 'arrange', 'translate']
  const totalActivities = activityFlags.filter(Boolean).length
  const completedActivities = activityKeys.filter((k, i) => activityFlags[i] && (starsMap[k] ?? 0) > 0).length
  const progressPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0

  return (
    <motion.div
      initial="initial"
      animate="animate"
      transition={{ staggerChildren: 0.05 }}
      className="grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
    >

      {/* ════════════════════════════════════════════════════════════════════
          ROW 1 — Hero (8) + [Flashcard + Q&A stacked] (4)
          Mobile: 12 + 12  ·  Desktop: 8 + 4
      ════════════════════════════════════════════════════════════════════ */}

      {/* HERO */}
      <Block className="col-span-12 md:col-span-8 relative overflow-hidden p-6 md:p-8 min-h-[200px] flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {/* Emoji watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-40 md:w-56 flex items-center justify-end overflow-hidden pointer-events-none select-none">
          <span className="text-[8rem] md:text-[10rem] leading-none opacity-[0.065] dark:opacity-[0.055] translate-x-6 md:translate-x-10">
            {icon}
          </span>
        </div>
        <div className="relative">
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-4">
            {languageCode?.toUpperCase()} · {exerciseCount} activities
          </span>
          <h1 className="text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white mb-1">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
          )}
        </div>
        <div className="relative mt-5">
          <div className="mb-4 max-w-xs">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">
              <span>Progress</span>
              <span>{completedActivities} / {totalActivities} activities</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
              />
            </div>
          </div>
          {firstExType && (
            <Link href={`/learn/${slug}/${firstExType}`}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm shadow-primary/30"
              >
                <PlayCircle size={15} />
                {progressPct > 0 ? 'Continue' : 'Start Lesson'}
              </motion.button>
            </Link>
          )}
        </div>
      </Block>

      {/* RIGHT COLUMN — two tiles stacked, match hero height on desktop */}
      <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:gap-4">

        {/* FLASHCARD TILE */}
        <Block
          whileHover={{ rotate: '2.5deg', scale: 1.07 }}
          className="flex-1 bg-primary dark:bg-primary border-primary/20 p-0 min-h-[140px]"
        >
          <Link href={`/learn/${slug}/vocabulary`} className="relative grid h-full place-content-center gap-3 p-6 min-h-[140px]">
            {(starsMap['vocabulary'] ?? 0) > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                {[1, 2, 3].map(n => (
                  <Star key={n} size={11} className={n <= (starsMap['vocabulary'] ?? 0) ? 'fill-white text-white' : 'fill-white/25 text-white/25'} />
                ))}
              </div>
            )}
            <Layers size={34} className="text-white mx-auto" />
            <div className="text-center">
              <p className="font-bold text-sm text-white">Flashcards</p>
              <p className="text-[11px] text-white/60 mt-0.5">{vocabItems.length} words to study</p>
            </div>
          </Link>
        </Block>

        {/* Q&A TILE */}
        <Block
          whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
          className="flex-1 bg-indigo-600 dark:bg-indigo-700 border-indigo-500/20 p-0 min-h-[140px]"
        >
          <Link
            href={hasQA ? `/learn/${slug}/qa` : `/learn/${slug}/${firstExType ?? ''}`}
            className="relative grid h-full place-content-center gap-3 p-6 min-h-[140px]"
          >
            {(starsMap['qa'] ?? 0) > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                {[1, 2, 3].map(n => (
                  <Star key={n} size={11} className={n <= (starsMap['qa'] ?? 0) ? 'fill-white text-white' : 'fill-white/25 text-white/25'} />
                ))}
              </div>
            )}
            <HelpCircle size={34} className="text-white mx-auto" />
            <div className="text-center">
              <p className="font-bold text-sm text-white">Q&amp;A Quiz</p>
              <p className="text-[11px] text-white/60 mt-0.5">
                {hasQA ? `${qaItems.length} questions` : 'Test yourself'}
              </p>
            </div>
          </Link>
        </Block>

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 2 — Vocab (4) + Phrases (4) + Story (4)
          Mobile: 6 + 6 + 12  ·  Desktop: 4 + 4 + 4
      ════════════════════════════════════════════════════════════════════ */}

      {hasVocab && (
        <Block whileHover={{ y: -6, scale: 1.02 }} className="col-span-6 md:col-span-4 p-5 min-h-[160px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer">
          <ActivityCard
            href={`/learn/${slug}/vocabulary`}
            icon={BookOpen}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-500"
            title="Vocabulary"
            subtitle={`${vocabItems.length} words`}
            stars={starsMap['vocabulary']}
            preview={
              vocabItems.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {vocabItems.slice(0, 3).map(w => (
                    <span key={w.word} className="text-[10px] font-semibold bg-indigo-500/8 text-indigo-500 px-1.5 py-0.5 rounded-full">
                      {w.icon ? `${w.icon} ` : ''}{w.word}
                    </span>
                  ))}
                  {vocabItems.length > 3 && (
                    <span className="text-[10px] text-slate-400">+{vocabItems.length - 3}</span>
                  )}
                </div>
              ) : undefined
            }
          />
        </Block>
      )}

      {hasPhrases && (
        <Block whileHover={{ y: -6, scale: 1.02 }} className="col-span-6 md:col-span-4 p-5 min-h-[160px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer">
          <ActivityCard
            href={`/learn/${slug}/phrases`}
            icon={MessageSquare}
            iconBg="bg-teal-500/10"
            iconColor="text-teal-500"
            title="Phrases"
            subtitle={`${phraseItems.length} expressions`}
            stars={starsMap['phrases']}
            preview={
              phraseItems[0] ? (
                <p className="text-[11px] text-slate-400 italic truncate">
                  &ldquo;{phraseItems[0].phrase}&rdquo;
                </p>
              ) : undefined
            }
          />
        </Block>
      )}

      {hasStory && (
        <Block whileHover={{ y: -6, scale: 1.02 }} className="col-span-12 md:col-span-4 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer">
          <ActivityCard
            href={`/learn/${slug}/story`}
            icon={BookMarked}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            title="Story"
            subtitle="Read & write in context"
            stars={starsMap['story']}
            preview={
              storyText ? (
                <p className="text-[11px] text-slate-400 italic line-clamp-2">
                  &ldquo;{storyText.slice(0, 80)}{storyText.length > 80 ? '…' : ''}&rdquo;
                </p>
              ) : undefined
            }
          />
        </Block>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ROW 3 — Arrange (4) + Translate (8)
          Mobile: 12 + 12  ·  Desktop: 4 + 8
      ════════════════════════════════════════════════════════════════════ */}

      {hasArrange && (
        <Block
          whileHover={{ rotate: '2.5deg', scale: 1.07 }}
          className="col-span-12 md:col-span-4 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[120px]"
        >
          <Link href={`/learn/${slug}/arrange`} className="relative grid h-full place-content-center gap-2.5 p-5 min-h-[120px]">
            {(starsMap['arrange'] ?? 0) > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                {[1, 2, 3].map(n => (
                  <Star
                    key={n}
                    size={11}
                    className={n <= (starsMap['arrange'] ?? 0) ? 'fill-white text-white' : 'fill-white/30 text-white/30'}
                  />
                ))}
              </div>
            )}
            <Shuffle size={30} className="text-white mx-auto" />
            <div className="text-center">
              <p className="font-bold text-sm text-white">Arrange</p>
              <p className="text-[11px] text-white/60 mt-0.5">{arrangeCount} sentences</p>
            </div>
          </Link>
        </Block>
      )}

      {hasTranslate && (
        <Block whileHover={{ y: -6, scale: 1.02 }} className="col-span-12 md:col-span-8 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer">
          <ActivityCard
            href={`/learn/${slug}/translate`}
            icon={PenLine}
            iconBg="bg-rose-500/10"
            iconColor="text-rose-500"
            title="Translate"
            subtitle={`${translateCount} exercises · Write yourself`}
            stars={starsMap['translate']}
          />
        </Block>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ROW 4 — MarIA (6) + Gems (6)
          Mobile: 6 + 6  ·  Desktop: 6 + 6
      ════════════════════════════════════════════════════════════════════ */}

      <Block
        whileHover={{ rotate: '2.5deg', scale: 1.07 }}
        className="col-span-6 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
      >
        <Link href="/maria" className="grid h-full place-content-center gap-2.5 p-5 min-h-[120px]">
          <Bot size={30} className="text-white mx-auto" />
          <div className="text-center">
            <p className="font-bold text-sm text-white">MarIA</p>
            <p className="text-[11px] text-white/70 mt-0.5">AI Tutor</p>
          </div>
        </Link>
      </Block>

      <Block
        whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
        className="col-span-6 bg-amber-400 dark:bg-amber-500 border-amber-300/40 p-0 min-h-[120px]"
      >
        <Link href="/gems" className="grid h-full place-content-center gap-2.5 p-5 min-h-[120px]">
          <Gem size={30} className="text-amber-950 mx-auto" />
          <div className="text-center">
            <p className="font-bold text-sm text-amber-950">Gems</p>
            <p className="text-[11px] text-amber-950/50 mt-0.5">Tips &amp; notes</p>
          </div>
        </Link>
      </Block>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 5 — 4 Play tiles (3+3+3+3)
          Mobile: 6+6+6+6 (2 per row)  ·  Desktop: 3+3+3+3 (all 4 in one row)
      ════════════════════════════════════════════════════════════════════ */}

      <Block
        whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
        className="col-span-6 md:col-span-3 bg-orange-500 dark:bg-orange-600 border-orange-400/20 p-0 min-h-[100px]"
      >
        <Link href="/play" className="grid h-full place-content-center gap-2 p-4 min-h-[100px]">
          <Zap size={26} className="text-white mx-auto" />
          <p className="font-bold text-xs text-white text-center">Speed Round</p>
        </Link>
      </Block>

      <Block
        whileHover={{ rotate: '2.5deg', scale: 1.07 }}
        className="col-span-6 md:col-span-3 bg-indigo-500 dark:bg-indigo-600 border-indigo-400/20 p-0 min-h-[100px]"
      >
        <Link href="/play" className="grid h-full place-content-center gap-2 p-4 min-h-[100px]">
          <Shuffle size={26} className="text-white mx-auto" />
          <p className="font-bold text-xs text-white text-center">Scramble</p>
        </Link>
      </Block>

      <Block
        whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
        className="col-span-6 md:col-span-3 bg-violet-600 dark:bg-violet-700 border-violet-400/20 p-0 min-h-[100px]"
      >
        <Link href="/play" className="grid h-full place-content-center gap-2 p-4 min-h-[100px]">
          <Headphones size={26} className="text-white mx-auto" />
          <p className="font-bold text-xs text-white text-center">Listen</p>
        </Link>
      </Block>

      <Block
        whileHover={{ rotate: '2.5deg', scale: 1.07 }}
        className="col-span-6 md:col-span-3 bg-emerald-600 dark:bg-emerald-700 border-emerald-400/20 p-0 min-h-[100px]"
      >
        <Link href="/play" className="grid h-full place-content-center gap-2 p-4 min-h-[100px]">
          <PenLine size={26} className="text-white mx-auto" />
          <p className="font-bold text-xs text-white text-center">Fill Blank</p>
        </Link>
      </Block>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 6 — Crown Challenge (full width)
      ════════════════════════════════════════════════════════════════════ */}

      <Block
        whileHover={allThreeStars ? { y: -4, scale: 1.01 } : {}}
        className={cn(
          'col-span-12 p-0 min-h-[90px] relative overflow-hidden',
          hasCrown
            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-300/40'
            : allThreeStars
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400/30'
            : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.04]'
        )}
      >
        <Link
          href={allThreeStars ? `/learn/${slug}/mastery` : '#'}
          className="flex items-center justify-between h-full px-6 py-4 min-h-[90px]"
          onClick={!allThreeStars ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              'size-12 rounded-2xl flex items-center justify-center',
              hasCrown ? 'bg-white/30' : allThreeStars ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'
            )}>
              {allThreeStars
                ? <Crown size={24} className="text-white" />
                : <Lock size={22} className="text-slate-400 dark:text-slate-500" />
              }
            </div>
            <div>
              <p className={cn(
                'font-bold text-sm',
                (hasCrown || allThreeStars) ? 'text-white' : 'text-slate-500 dark:text-slate-400'
              )}>
                {hasCrown ? '👑 Crown Earned!' : 'Crown Challenge'}
              </p>
              <p className={cn(
                'text-[11px] mt-0.5',
                (hasCrown || allThreeStars) ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
              )}>
                {hasCrown
                  ? 'Module mastered — you can use this in real life'
                  : allThreeStars
                  ? 'All lessons at ⭐⭐⭐ — take the mastery quiz!'
                  : 'Earn ⭐⭐⭐ on all lessons to unlock'}
              </p>
            </div>
          </div>
          {allThreeStars && !hasCrown && (
            <ArrowRight size={20} className="text-white/70 shrink-0" />
          )}
        </Link>
      </Block>

    </motion.div>
  )
}
