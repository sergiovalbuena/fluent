'use client'

import React from 'react'
import Link from 'next/link'
import { motion, type MotionProps } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight, BookOpen, Check, Flame, Gem, MessageCircle, Shield, Shuffle, Sparkles, Star, Target, Trophy, Type, Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLanguage } from '@/lib/languages'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ProgressData = {
  languageCode: string
  streak: number
  longestStreak: number
  freezes: number
  totalXp: number
  gems: number
  accuracy: number | null
  mastered: { words: number; phrases: number; questions: number }
  course: {
    modulesDone: number
    modulesTotal: number
    activitiesDone: number
    activitiesTotal: number
    stars: number
    next: { slug: string; title: string; position: number } | null
    units: { emoji: string; title: string; total: number; done: number }[]
  }
  skills: { type: string; done: number; total: number }[]
  /** Heatmap days, oldest first, whole weeks starting on Monday */
  days: { date: string; count: number; future: boolean }[]
  recent: { id: string; type: string; moduleTitle: string; slug: string | null; score: number | null; stars: number; completedAt: string }[]
}

const SKILLS: Record<string, { icon: LucideIcon; color: string }> = {
  vocabulary: { icon: BookOpen, color: '#ff8052' },
  phrases: { icon: MessageCircle, color: '#0ea5e9' },
  qa: { icon: Sparkles, color: '#8b5cf6' },
  story: { icon: Type, color: '#10b981' },
  arrange: { icon: Shuffle, color: '#f59e0b' },
  translate: { icon: Target, color: '#ec4899' },
}
const SKILL_ORDER = Object.keys(SKILLS)

// ── Block primitive (mirrors dashboard) ───────────────────────────────────────
type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps
const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.96, y: 24, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1 },
    }}
    transition={{ type: 'spring', mass: 1, stiffness: 260, damping: 28 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] shadow-[0_2px_12px_rgba(0,0,0,0.05)]',
      className,
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500', className)}>{children}</p>
)

// ── Component ─────────────────────────────────────────────────────────────────
export function ProgressContent({ data }: { data: ProgressData }) {
  const t = useTranslations('progress')
  const locale = useLocale()
  const { course, streak } = data
  const language = getLanguage(data.languageCode)
  const languageName = (() => {
    try { return new Intl.DisplayNames([locale], { type: 'language' }).of(data.languageCode) ?? language.name } catch { return language.name }
  })()
  const coursePct = course.modulesTotal ? Math.round((course.modulesDone / course.modulesTotal) * 100) : 0

  // This week = the last 7 heatmap days
  const week = data.days.slice(-7)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' })
  const todayKey = new Date().toISOString().slice(0, 10)

  const activeDays = data.days.filter(d => d.count > 0).length
  const activityTotal = data.days.reduce((s, d) => s + d.count, 0)
  const maxDay = Math.max(1, ...data.days.map(d => d.count))
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / maxDay) * 4)))
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })

  const firstUnitDone = course.units.length > 0 && course.units[0].done === course.units[0].total
  const milestones = [
    { id: 'first', icon: Sparkles, label: t('m_first'), value: course.activitiesDone, target: 1 },
    { id: 'lesson', icon: BookOpen, label: t('m_lesson'), value: course.modulesDone, target: 1 },
    { id: 'streak', icon: Flame, label: t('m_streak7'), value: data.longestStreak, target: 7 },
    { id: 'words', icon: Type, label: t('m_words50'), value: data.mastered.words, target: 50 },
    { id: 'xp', icon: Zap, label: t('m_xp500'), value: data.totalXp, target: 500 },
    { id: 'unit', icon: Trophy, label: t('m_unit'), value: firstUnitDone ? 1 : 0, target: 1 },
  ]
  const achieved = milestones.filter(m => m.value >= m.target).length

  const skills = [...data.skills].sort((a, b) => SKILL_ORDER.indexOf(a.type) - SKILL_ORDER.indexOf(b.type))

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >
          {/* ── Journey ────────────────────────────────────────────────────── */}
          <Block className="col-span-12 lg:col-span-8 relative overflow-hidden p-5 md:p-7 flex flex-col gap-5">
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  {language.flag} {t('journey_badge', { language: languageName })}
                </span>
                <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-tight text-slate-900 dark:text-white">
                  {course.next ? t('lesson_of', { n: course.next.position, total: course.modulesTotal }) : t('course_done')}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('modules_done', { done: course.modulesDone, total: course.modulesTotal })}
                  {' · '}
                  {t('activities_done', { done: course.activitiesDone, total: course.activitiesTotal })}
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl md:text-6xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{coursePct}</span>
                <span className="text-xl font-bold text-slate-400">%</span>
              </div>
            </div>

            {/* Units */}
            <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(course.units.length, 1)}, minmax(0, 1fr))` }}>
              {course.units.map((u, i) => {
                const pct = u.total ? u.done / u.total : 0
                return (
                  <div key={i} className="group min-w-0" title={`${u.title} · ${u.done}/${u.total}`}>
                    <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>{u.emoji}</span>
                      <span className="hidden truncate sm:inline">{u.title}</span>
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] dark:border-white/[0.06] pt-4">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span className="tabular-nums">{course.stars}</span>
                <span className="text-slate-400">/ {course.activitiesTotal * 3} {t('stars_label')}</span>
              </span>
              {course.next && (
                <Link
                  href={`/learn/${course.next.slug}`}
                  className="group inline-flex max-w-full items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98]"
                >
                  <span className="truncate">{course.activitiesDone > 0 ? t('continue') : t('start')}: {course.next.title}</span>
                  <ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </Block>

          {/* ── Streak ─────────────────────────────────────────────────────── */}
          <Block
            className="col-span-12 sm:col-span-6 lg:col-span-4 relative overflow-hidden p-5 md:p-6 flex flex-col justify-between gap-4 border-none text-white"
            style={{ background: streak > 0 ? 'linear-gradient(160deg, #1b1f2e 0%, #7c2d12 70%, #c2410c 100%)' : 'linear-gradient(160deg, #1b1f2e 0%, #2b3150 100%)' }}
          >
            <div className="flex items-center justify-between">
              <Label className="text-white/50">{t('streak_title')}</Label>
              {data.freezes > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-sky-200">
                  <Shield size={11} /> {t('freezes', { n: data.freezes })}
                </span>
              )}
            </div>
            {streak > 0 ? (
              <div>
                <div className="flex items-end gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-4xl leading-none"
                  >🔥</motion.span>
                  <span className="text-6xl font-bold tabular-nums leading-none">{streak}</span>
                  <span className="pb-1 text-lg font-semibold text-white/60">{t('streak_days', { n: streak })}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{t('streak_best', { n: Math.max(data.longestStreak, streak) })}</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold leading-tight">{t('streak_none')}</p>
                <p className="mt-1 text-sm text-white/50">{t('streak_none_hint')}</p>
              </div>
            )}
            <div className="grid grid-cols-7 gap-1.5">
              {week.map(d => {
                const isToday = d.date === todayKey
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-[11px] transition-colors',
                        d.count > 0 ? 'bg-orange-400 text-white' : d.future ? 'bg-white/[0.04]' : 'bg-white/10',
                        isToday && 'ring-2 ring-white/70',
                      )}
                    >
                      {d.count > 0 && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className={cn('text-[10px] font-bold', isToday ? 'text-white' : 'text-white/40')}>
                      {weekday.format(new Date(d.date + 'T00:00:00Z'))}
                    </span>
                  </div>
                )
              })}
            </div>
          </Block>

          {/* ── Stats ──────────────────────────────────────────────────────── */}
          <StatTile
            className="col-span-6 sm:col-span-6 lg:col-span-3"
            icon={Zap} tone="text-primary bg-primary/10"
            label={t('xp')} value={data.totalXp.toLocaleString(locale)}
          />
          <StatTile
            className="col-span-6 lg:col-span-3"
            icon={Type} tone="text-violet-600 bg-violet-500/10 dark:text-violet-300"
            label={t('words_mastered')} value={data.mastered.words.toLocaleString(locale)}
            hint={t('words_hint', { phrases: data.mastered.phrases, questions: data.mastered.questions })}
          />
          <StatTile
            className="col-span-6 lg:col-span-3"
            icon={Gem} tone="text-sky-600 bg-sky-500/10 dark:text-sky-300"
            label={t('gems')} value={data.gems.toLocaleString(locale)}
            href="/gems"
          />
          <StatTile
            className="col-span-6 lg:col-span-3"
            icon={Target} tone="text-emerald-600 bg-emerald-500/10 dark:text-emerald-300"
            label={t('accuracy')} value={data.accuracy === null ? '—' : `${data.accuracy}%`}
          />

          {/* ── Heatmap ────────────────────────────────────────────────────── */}
          <Block className="col-span-12 lg:col-span-8 p-5 md:p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <Label>{t('activity_title')}</Label>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('activity_weeks', { n: data.days.length / 7 })}</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{activeDays}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{t('active_days')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{activityTotal}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{t('activities_count')}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="grid grid-rows-7 gap-[3px] pt-px text-[9px] font-bold text-slate-400">
                {week.map((d, i) => (
                  <span key={d.date} className={cn('flex items-center leading-none', i % 2 === 1 && 'invisible')}>
                    {weekday.format(new Date(d.date + 'T00:00:00Z'))}
                  </span>
                ))}
              </div>
              <div className="grid flex-1 grid-flow-col grid-rows-7 gap-[3px]">
                {data.days.map((d, i) => (
                  <motion.span
                    key={d.date}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + Math.floor(i / 7) * 0.015, duration: 0.25 }}
                    title={d.future ? undefined : t('day_tooltip', { count: d.count, date: dateFmt.format(new Date(d.date + 'T00:00:00Z')) })}
                    className={cn(
                      'aspect-square w-full rounded-[3px]',
                      d.future && 'opacity-0',
                      d.date === todayKey && 'ring-2 ring-primary/50 ring-offset-1 ring-offset-white dark:ring-offset-[#202638]',
                      ['bg-slate-100 dark:bg-white/[0.06]', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'][level(d.count)],
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold text-slate-400">
              {t('less')}
              {['bg-slate-100 dark:bg-white/[0.06]', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'].map(c => (
                <span key={c} className={cn('size-2.5 rounded-[3px]', c)} />
              ))}
              {t('more')}
            </div>
          </Block>

          {/* ── Skills ─────────────────────────────────────────────────────── */}
          <Block className="col-span-12 sm:col-span-6 lg:col-span-4 p-5 md:p-6 flex flex-col gap-3">
            <Label>{t('skills_title')}</Label>
            <ul className="flex flex-col gap-3">
              {skills.map((s, i) => {
                const meta = SKILLS[s.type] ?? { icon: BookOpen, color: '#94a3b8' }
                const Icon = meta.icon
                const pct = s.total ? s.done / s.total : 0
                return (
                  <li key={s.type} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${meta.color}1a`, color: meta.color }}>
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{t(`type_${s.type}` as 'type_vocabulary')}</span>
                        <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400">{s.done}/{s.total}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.07]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: meta.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Block>

          {/* ── Milestones ─────────────────────────────────────────────────── */}
          <Block className="col-span-12 p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <Label>{t('milestones_title')}</Label>
              <span className="text-[11px] font-bold tabular-nums text-primary">{t('milestones_count', { done: achieved, total: milestones.length })}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {milestones.map(m => {
                const ok = m.value >= m.target
                const pct = Math.min(1, m.value / m.target)
                const Icon = m.icon
                return (
                  <motion.div
                    key={m.id}
                    whileHover={ok ? { y: -3 } : undefined}
                    className={cn(
                      'relative flex flex-col gap-2 rounded-2xl p-3.5 transition-colors',
                      ok ? 'bg-primary/[0.08] dark:bg-primary/[0.12]' : 'bg-slate-50 dark:bg-white/[0.03]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('flex size-9 items-center justify-center rounded-xl', ok ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-200/70 text-slate-400 dark:bg-white/[0.06]')}>
                        <Icon size={17} />
                      </span>
                      {ok && <Check size={16} strokeWidth={3} className="text-primary" />}
                    </div>
                    <p className={cn('text-xs font-bold leading-tight', ok ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>{m.label}</p>
                    {!ok && (
                      <div>
                        <div className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct * 100}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] font-semibold tabular-nums text-slate-400">{Math.min(m.value, m.target)}/{m.target}</p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </Block>

          {/* ── Recent ─────────────────────────────────────────────────────── */}
          <Block className="col-span-12 lg:col-span-8 p-5 md:p-6">
            <div className="mb-2 flex items-center justify-between">
              <Label>{t('recent_title')}</Label>
              <Link href="/learn" className="text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity">{t('browse')} →</Link>
            </div>
            {data.recent.length > 0 ? (
              <ul>
                {data.recent.map(r => {
                  const meta = SKILLS[r.type] ?? { icon: BookOpen, color: '#94a3b8' }
                  const Icon = meta.icon
                  const row = (
                    <>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${meta.color}1a`, color: meta.color }}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{t(`type_${r.type}` as 'type_vocabulary')}</span>
                        <span className="block truncate text-xs text-slate-400 dark:text-slate-500">{r.moduleTitle}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="flex gap-0.5">
                          {[1, 2, 3].map(n => (
                            <Star key={n} size={12} className={n <= r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'} />
                          ))}
                        </span>
                        <span className="text-[10px] text-slate-400">{dateFmt.format(new Date(r.completedAt))}</span>
                      </span>
                    </>
                  )
                  return (
                    <li key={r.id}>
                      {r.slug ? (
                        <Link href={`/learn/${r.slug}/${r.type}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 -mx-2 hover:bg-primary/[0.04] dark:hover:bg-primary/[0.06] transition-colors">{row}</Link>
                      ) : (
                        <div className="flex items-center gap-3 px-2 py-2.5 -mx-2">{row}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen size={22} /></span>
                <p className="font-bold text-slate-900 dark:text-white">{t('recent_empty')}</p>
                <p className="max-w-xs text-sm text-slate-400">{t('recent_empty_hint')}</p>
              </div>
            )}
          </Block>

          {/* ── How points work ────────────────────────────────────────────── */}
          <Link href="/progress/points" className="col-span-12 lg:col-span-4">
            <Block
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative h-full overflow-hidden p-5 md:p-6 flex flex-col justify-between gap-6 border-none text-white"
              style={{ background: 'linear-gradient(150deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)' }}
            >
              <div className="flex gap-2">
                {[
                  { Icon: Star, c: 'text-amber-300 fill-amber-300' },
                  { Icon: Gem, c: 'text-sky-300' },
                  { Icon: Flame, c: 'text-orange-300' },
                  { Icon: Zap, c: 'text-yellow-200' },
                ].map(({ Icon, c }, i) => (
                  <span
                    key={i}
                    className="flex size-9 items-center justify-center rounded-xl bg-white/10 transition-transform duration-300 group-hover:-translate-y-1"
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    <Icon size={16} className={c} />
                  </span>
                ))}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-base font-bold leading-tight">{t('points_title')}</p>
                  <p className="mt-1 text-xs text-white/55">{t('points_hint')}</p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
              </div>
            </Block>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}

function StatTile({ className, icon: Icon, tone, label, value, hint, href }: {
  className?: string
  icon: LucideIcon
  tone: string
  label: string
  value: string
  hint?: string
  href?: string
}) {
  const body = (
    <Block whileHover={{ y: -3 }} className={cn('group h-full p-4 md:p-5 flex flex-col gap-3', !href && className)}>
      <span className={cn('flex size-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6', tone)}>
        <Icon size={17} />
      </span>
      <div>
        <p className="text-2xl md:text-3xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
      </div>
    </Block>
  )
  return href ? <Link href={href} className={className}>{body}</Link> : body
}
