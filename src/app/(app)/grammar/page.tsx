'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, GraduationCap, ListChecks, Trophy } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { useGrammarIndex } from '@/components/grammar/use-grammar'
import { StatusChip } from '@/components/grammar/status-chip'
import { GemChip } from '@/components/practice/reward-chips'
import { getLanguage } from '@/lib/languages'
import { MASTERY, gemsLeft, masteredCount, moduleStatus, type GrammarIndexEntry, type ModuleProgress, type ModuleStatus } from '@/lib/grammar'
import { cn } from '@/lib/utils'

const list = { animate: { transition: { staggerChildren: 0.03 } } }
const item = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

export default function GrammarPage() {
  const t = useTranslations('grammar')
  const { index, progress, languageCode, translationLang, expl } = useGrammarIndex()
  const language = getLanguage(languageCode)

  const statuses = new Map<string, ModuleStatus>(
    (index?.modules ?? []).map(m => [m.slug, moduleStatus(m, progress[m.slug])]),
  )
  const mastered = [...statuses.values()].filter(s => s === 'mastered').length
  // Next module: the first started one, else the first not mastered
  const next = index
    ? index.modules.find(m => statuses.get(m.slug) === 'started') ?? index.modules.find(m => statuses.get(m.slug) !== 'mastered')
    : undefined
  const fresh = [...statuses.values()].every(s => s === 'new')

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />

      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">

          {/* Header */}
          <section className="relative overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/[0.05] dark:bg-[#202638] md:p-8">
            <GraduationCap aria-hidden size={170} strokeWidth={1.4} className="pointer-events-none absolute -bottom-10 -right-6 text-indigo-500 opacity-[0.06]" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                  {language.flag} {language.name}
                  {index ? <> · {t('count', { count: index.modules.length })}</> : null}
                </span>
                <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 dark:text-white md:text-[1.75rem]">{t('title')}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
                {index && expl === 'en' && translationLang !== 'en' && (
                  <p className="mt-2 text-xs font-semibold text-slate-400">{t('english_explanations')}</p>
                )}
                {index && (
                  next ? (
                    <Link
                      href={`/grammar/${next.slug}`}
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98]"
                    >
                      {fresh ? t('start_first') : t('continue_module', { n: next.number })} <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400"><Trophy size={15} /> {t('all_done')}</p>
                  )
                )}
              </div>

              {index && (
                <div className="w-full rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.04] md:w-80">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('progress', { done: mastered, total: index.modules.length })}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-400">{Math.round((mastered / index.modules.length) * 100)}%</span>
                  </div>
                  {/* One cell per module */}
                  <div className="mt-3 grid grid-cols-9 gap-1.5">
                    {index.modules.map(m => {
                      const s = statuses.get(m.slug)
                      return (
                        <Link
                          key={m.slug}
                          href={`/grammar/${m.slug}`}
                          title={`${m.number}. ${m.title}`}
                          className={cn(
                            'flex aspect-square items-center justify-center rounded-md text-[10px] font-bold tabular-nums transition-transform hover:scale-110',
                            s === 'mastered' && 'bg-indigo-500 text-white',
                            s === 'started' && 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300',
                            s === 'new' && 'bg-black/[0.05] text-slate-400 dark:bg-white/[0.06]',
                          )}
                        >
                          {m.number}
                        </Link>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">{t('device_note')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Modules by part */}
          {index === undefined ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-3xl bg-white/70 dark:bg-white/[0.04]" />
              ))}
            </div>
          ) : index === null ? (
            <p className="rounded-3xl border border-dashed border-black/[0.08] p-10 text-center text-sm text-slate-500 dark:border-white/[0.1]">{t('unavailable')}</p>
          ) : (
            index.parts.map(part => (
              <section key={part.number}>
                <div className="mb-3 flex flex-col gap-0.5 px-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <span className="text-indigo-500">{String(part.number).padStart(2, '0')}</span> · {part.title}
                  </h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{part.description}</span>
                </div>
                <motion.div variants={list} initial="initial" animate="animate" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {index.modules.filter(m => m.part === part.number).map((m, i, all) => (
                    <ModuleCard key={m.slug} module={m} progress={progress[m.slug]} status={statuses.get(m.slug) ?? 'new'} span={wideSpan(i, all.length)} />
                  ))}
                </motion.div>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

/** Some cards span two columns so every row is full (2 columns on sm, 3 on lg) */
function wideSpan(i: number, n: number): string {
  const classes: string[] = []
  if (i === 0 && n % 2 === 1) classes.push('sm:col-span-2')
  else if (n % 2 === 1) classes.push('sm:col-span-1')
  const lgWide = (n % 3 === 1 && (i === 0 || i === n - 1)) || (n % 3 === 2 && i === 0)
  classes.push(lgWide ? 'lg:col-span-2' : 'lg:col-span-1')
  return classes.join(' ')
}

function ModuleCard({ module: m, progress, status, span }: { module: GrammarIndexEntry; progress: ModuleProgress | undefined; status: ModuleStatus; span: string }) {
  const t = useTranslations('grammar')
  const done = masteredCount(m, progress)
  const total = m.exercises.length
  const wide = span.includes('lg:col-span-2')
  return (
    <motion.div variants={item} className={span}>
      <Link
        href={`/grammar/${m.slug}`}
        className="group flex h-full flex-col gap-3 rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] active:scale-[0.99] dark:border-white/[0.05] dark:bg-[#202638]"
      >
        <span className="flex items-start justify-between gap-3">
          <span className={cn(
            'text-[2rem] font-black leading-none tabular-nums tracking-tight transition-colors',
            status === 'mastered' ? 'text-indigo-500' : 'text-slate-200 group-hover:text-indigo-300 dark:text-white/[0.12] dark:group-hover:text-indigo-400/60',
          )}>
            {String(m.number).padStart(2, '0')}
          </span>
          <StatusChip status={status} />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">{m.title}</span>
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{m.tagline}</span>
          {wide && (
            <span className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
              {m.sections.slice(0, 5).map(title => (
                <span key={title} className="rounded-full bg-indigo-500/[0.07] px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">{title}</span>
              ))}
            </span>
          )}
        </span>
        <span className="flex flex-col gap-2">
          <span className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><Clock size={12} /> {t('minutes', { n: m.minutes })}</span>
            <span className="flex items-center gap-1"><ListChecks size={12} /> {t('exercises_count', { n: total })}</span>
            {status !== 'mastered' && (
              <GemChip gems={gemsLeft(m.exercises.map(e => e.id), progress?.best ?? {})} className="ml-auto" />
            )}
          </span>
          <span className="flex gap-1" aria-hidden>
            {m.exercises.map(e => (
              <span
                key={e.id}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  (progress?.best[e.id] ?? -1) >= MASTERY ? 'bg-indigo-500' : progress?.best[e.id] !== undefined ? 'bg-indigo-500/30' : 'bg-black/[0.06] dark:bg-white/[0.08]',
                )}
              />
            ))}
          </span>
          <span className="sr-only">{done}/{total}</span>
        </span>
      </Link>
    </motion.div>
  )
}
