'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, RotateCcw, BookOpen, MessageSquare, HelpCircle, BookMarked, Shuffle, PenLine, type LucideIcon, LayoutList } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { HINT_AREA, SectionTitle } from '@/components/lesson/title-hint'
import type { SectionTitleKey } from '@/lib/section-titles'
import { Block } from '@/components/lesson/player/block'

export const ACTIVITIES = [
  { key: 'vocabulary', label: 'Vocab',    Icon: BookOpen,      accent: '#ff8052', light: '#fff4f0' },
  { key: 'phrases',    label: 'Phrases',  Icon: MessageSquare, accent: '#3b82f6', light: '#eff6ff' },
  { key: 'qa',         label: 'Quiz',     Icon: HelpCircle,    accent: '#8b5cf6', light: '#f5f3ff' },
  { key: 'story',      label: 'Story',    Icon: BookMarked,    accent: '#10b981', light: '#ecfdf5' },
  { key: 'arrange',    label: 'Arrange',  Icon: Shuffle,       accent: '#f59e0b', light: '#fffbeb' },
  { key: 'translate',  label: 'Write',    Icon: PenLine,       accent: '#ec4899', light: '#fdf2f8' },
]

// Hoisted constants
export const COLOR_CORRECT            = '#22c55e'
export const COLOR_INCORRECT          = '#ef4444'

// ─── Shared sub-components ────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <p className="text-muted-foreground text-center text-sm">{message}</p>
    </div>
  )
}

// ─── Activity Hero — full-width header, styled like the module hero ──────────

export interface ActivityHeroTab {
  href: string
  icon: LucideIcon
  label: React.ReactNode
  iconColorClass: string
  iconBgClass: string
  barClass: string
  active?: boolean
}

/** The activity's main action, shown in the hero (start / continue / review) */
export interface ActivityHeroCta {
  icon: LucideIcon
  label: React.ReactNode
  sublabel: string
  /** Card colour: the writing practice is orange, pronunciation violet */
  tone?: 'primary' | 'violet'
  /** 0–1; omitted when the activity has no saved progress */
  progress?: number
  onClick: () => void
}

/** The four lesson activities as hero tabs, with the current one marked active */
export function activityTabs(slug: string, active: 'vocabulary' | 'phrases' | 'qa' | 'story', qaTitle: SectionTitleKey = 'qa'): ActivityHeroTab[] {
  return [
    { href: `/learn/${slug}/vocabulary`, icon: BookOpen, label: <SectionTitle k="vocab_tab" />, iconColorClass: 'text-indigo-500', iconBgClass: 'bg-indigo-500/10', barClass: 'bg-indigo-500', active: active === 'vocabulary' },
    { href: `/learn/${slug}/phrases`, icon: MessageSquare, label: <SectionTitle k="phrases" />, iconColorClass: 'text-teal-600 dark:text-teal-400', iconBgClass: 'bg-teal-500/10', barClass: 'bg-teal-500', active: active === 'phrases' },
    { href: `/learn/${slug}/qa`, icon: HelpCircle, label: <SectionTitle k={qaTitle} />, iconColorClass: 'text-violet-500', iconBgClass: 'bg-violet-500/10', barClass: 'bg-violet-500', active: active === 'qa' },
    { href: `/learn/${slug}/story`, icon: BookMarked, label: <SectionTitle k="story" />, iconColorClass: 'text-amber-600 dark:text-amber-400', iconBgClass: 'bg-amber-500/10', barClass: 'bg-amber-500', active: active === 'story' },
  ]
}

/** Card that opens the "all items" dialog of a section */
export function AllItemsCard({ titleKey, onClick, iconClass, iconBgClass, className }: {
  titleKey: SectionTitleKey
  onClick: () => void
  iconClass: string
  iconBgClass: string
  className?: string
}) {
  const t = useTranslations('lesson')
  return (
    <Block
      whileHover={{ rotate: '-1.5deg', scale: 1.03 }}
      className={cn('p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]', className)}
    >
      <button type="button" onClick={onClick} className="flex h-full w-full items-center gap-3 p-4 text-left">
        <span className={cn('size-10 shrink-0 rounded-xl flex items-center justify-center', iconBgClass)}>
          <LayoutList size={18} className={iconClass} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900 dark:text-white"><SectionTitle k={titleKey} /></span>
          <span className="block text-[11px] text-slate-400 mt-0.5">{t('ov_quick_view')}</span>
        </span>
      </button>
    </Block>
  )
}

export function ActivityHero({
  icon: Icon, iconColorClass, badgeLabel, badgeColorClass, title, titleHref, cta, activities,
}: {
  icon: LucideIcon
  iconColorClass: string
  badgeLabel: React.ReactNode
  badgeColorClass: string
  /** Lesson name (or the story's name) shown under the activity badge */
  title?: string
  /** Makes the title a link (the lesson name links to the lesson page) */
  titleHref?: string
  /** One card, or several side by side as equals (writing and pronunciation) */
  cta?: ActivityHeroCta | ActivityHeroCta[]
  activities: ActivityHeroTab[]
}) {
  const ctas = cta ? (Array.isArray(cta) ? cta : [cta]) : []
  return (
    <Block className="col-span-12 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-0">
      {/* Top: all 4 activities as tabs — the active one gets its colour bar and filled icon */}
      <div className="p-4 md:p-6 pb-4 md:pb-5">
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {activities.map(a => a.active ? (
            <div
              key={a.href}
              aria-current="page"
              {...HINT_AREA}
              className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none"
            >
              <div className={cn('h-[3px] w-full shrink-0', a.barClass)} />
              <div className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 flex-1">
                <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', a.barClass)}>
                  <a.icon size={18} className="text-white" />
                </div>
                <p className={cn('font-bold text-[13px] text-center', a.iconColorClass)}>{a.label}</p>
              </div>
            </div>
          ) : (
            <Link key={a.href} href={a.href} {...HINT_AREA} className="block group h-full">
              <motion.div
                whileHover={{ y: -4, scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 flex-1">
                  <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', a.iconBgClass)}>
                    <a.icon size={18} className={a.iconColorClass} />
                  </div>
                  <p className="font-bold text-[13px] text-center text-slate-400 dark:text-slate-500">{a.label}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-6 md:mx-8 h-px bg-black/[0.04] dark:bg-white/[0.05]" />

      {/* Bottom: activity badge (+ title when meaningful) and progress */}
      <div className="relative px-6 md:px-8 py-5 md:py-6">
        {/* Icon watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-40 md:w-56 flex items-center justify-end overflow-hidden pointer-events-none select-none">
          <Icon
            size={120}
            strokeWidth={1.5}
            className={cn('opacity-[0.06] dark:opacity-[0.05] translate-x-6 md:translate-x-10', iconColorClass)}
          />
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="min-w-0" {...HINT_AREA}>
            <h1>
              <span className={cn('inline-flex items-center text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full', badgeColorClass)}>
                {badgeLabel}
              </span>
              {title && (titleHref ? (
                <Link
                  href={titleHref}
                  className="block mt-3 text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white hover:text-primary transition-colors"
                >
                  {title}
                </Link>
              ) : (
                <span className="block mt-3 text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white">
                  {title}
                </span>
              ))}
            </h1>
          </div>

          {ctas.length > 0 && (
            <div className={cn('grid gap-3 w-full', ctas.length > 1 ? 'grid-cols-2 sm:w-[520px]' : 'sm:w-[340px]')}>
              {ctas.map((c, i) => (
                <motion.div
                  key={i}
                  whileHover={{ rotate: '1.5deg', scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className={cn(
                    'relative overflow-hidden rounded-2xl p-4 shadow-[0_4px_0_rgba(0,0,0,0.08)]',
                    c.tone === 'violet' ? 'bg-violet-500' : 'bg-primary',
                  )}
                >
                  <c.icon size={72} aria-hidden className="absolute -right-3 -bottom-4 text-white/10 rotate-12" />
                  <button type="button" onClick={c.onClick} className="relative flex w-full items-center gap-3 text-left">
                    <span className="size-10 shrink-0 rounded-xl bg-white/20 flex items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.12)]">
                      <c.icon size={18} className="text-white" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-bold text-white leading-tight break-words">{c.label}</span>
                      <span className="block text-xs text-white/75 mt-0.5 tabular-nums">{c.sublabel}</span>
                    </span>
                    <span className={cn(
                      'hidden sm:flex size-6 shrink-0 rounded-full bg-white items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.12)]',
                      c.tone === 'violet' ? 'text-violet-500' : 'text-primary',
                    )}>
                      <ArrowRight size={13} strokeWidth={2.8} />
                    </span>
                  </button>
                  {c.progress != null && (
                    <div className="relative mt-3 h-1.5 rounded-full bg-black/15 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-white"
                        initial={{ width: 0 }}
                        animate={{ width: `${c.progress * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Block>
  )
}

export function CompletionCard({
  icon, title, subtitle, nextLabel, onNext, onRestart,
}: {
  icon: string; title: string; subtitle: string
  nextLabel: string; onNext: () => void; onRestart: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 w-full text-center py-10 px-6">
      <div className="text-7xl">{icon}</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onNext}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25"
        >
          {nextLabel} <ArrowRight size={16} />
        </button>
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold active:scale-95 transition-transform"
        >
          <RotateCcw size={13} /> Practice again
        </button>
      </div>
    </div>
  )
}
