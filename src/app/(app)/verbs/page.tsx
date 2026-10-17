'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookType, Search, X, Zap } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { VerbDialog } from '@/components/verbs/verb-dialog'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { getLanguage } from '@/lib/languages'
import { loadVerbExamples, loadVerbForms, loadVerbIndex, verbTranslation, type VerbEntry, type VerbExamples, type VerbForms, type VerbIndex } from '@/lib/verbs'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'essentials'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function VerbsPage() {
  const t = useTranslations('verbs')
  const { languageCode, translationLang } = useActiveLanguage()
  const language = getLanguage(languageCode)

  // undefined: loading · null: no verbs for this course
  const [index, setIndex] = useState<VerbIndex | null | undefined>(undefined)
  const [allForms, setAllForms] = useState<Record<string, VerbForms> | null>(null)
  const [allExamples, setAllExamples] = useState<Record<string, VerbExamples> | null>(null)
  const [open, setOpen] = useState<VerbEntry | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let cancelled = false
    loadVerbIndex(languageCode).then(data => { if (!cancelled) setIndex(data) })
    return () => { cancelled = true }
  }, [languageCode])

  function openVerb(verb: VerbEntry) {
    setOpen(verb)
    if (!allForms) loadVerbForms(languageCode).then(setAllForms)
    if (!allExamples) loadVerbExamples(languageCode).then(setAllExamples)
  }

  // Search matches the verb or its translation, ignoring accents
  const visible = useMemo(() => {
    if (!index) return []
    const q = norm(deferredQuery.trim())
    return index.verbs.filter(v =>
      (filter === 'all' || v.essential) &&
      (!q || norm(v.infinitive).includes(q) || norm(verbTranslation(v, translationLang)).includes(q)),
    )
  }, [index, deferredQuery, filter, translationLang])

  // Without a search, verbs are grouped: essentials first, then by lesson
  const groups = useMemo(() => {
    if (deferredQuery.trim()) return [{ key: 'results', title: null, hint: null, verbs: visible }]
    const byKey = new Map<string, { key: string; title: string; hint: string | null; verbs: VerbEntry[] }>()
    for (const v of visible) {
      const key = v.essential ? 'essentials' : `lesson-${v.lesson}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          title: v.essential ? t('essentials') : t('lesson', { n: v.lesson }),
          hint: v.essential ? t('essentials_hint') : null,
          verbs: [],
        })
      }
      byKey.get(key)!.verbs.push(v)
    }
    return [...byKey.values()]
  }, [visible, deferredQuery, t])

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />

      <main className="flex-1 px-3 md:px-6 py-4 md:py-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-5">

          {/* Header */}
          <section className="relative overflow-hidden rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <BookType aria-hidden size={160} strokeWidth={1.5} className="pointer-events-none absolute -right-6 -bottom-8 text-primary opacity-[0.06]" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  {language.flag} {language.name}
                  {index ? <> · {t('count', { count: index.verbs.length })}</> : null}
                </span>
                <h1 className="mt-3 text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white">{t('title')}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
                {index && (
                  <Link
                    href="/verbs/practice"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98]"
                  >
                    <Zap size={15} /> {t('practice')}
                  </Link>
                )}
              </div>

              {index && (
                <div className="flex w-full flex-col gap-2 md:w-80">
                  <label className="relative block">
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={t('search')}
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] pl-10 pr-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {query && (
                      <button type="button" aria-label="Clear" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <div className="flex gap-1.5">
                    {(['all', 'essentials'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                          filter === f
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 text-slate-500 hover:text-slate-700 dark:bg-white/[0.06] dark:text-slate-400',
                        )}
                      >
                        {f === 'all' ? t('all') : t('essentials')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Verbs */}
          {index === undefined ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-white/70 dark:bg-white/[0.04]" />
              ))}
            </div>
          ) : index === null ? (
            <p className="rounded-3xl border border-dashed border-black/[0.08] dark:border-white/[0.1] p-10 text-center text-sm text-slate-500">{t('unavailable')}</p>
          ) : visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">{t('no_results', { query })}</p>
          ) : (
            groups.map(group => (
              <section key={group.key}>
                {group.title && (
                  <div className="mb-2 flex items-baseline gap-2 px-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{group.title}</h2>
                    {group.hint && <span className="text-[11px] text-slate-400 dark:text-slate-500">{group.hint}</span>}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {group.verbs.map(verb => (
                    <button
                      key={verb.id}
                      type="button"
                      onClick={() => openVerb(verb)}
                      className="group flex flex-col gap-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638] px-4 py-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{verb.infinitive}</span>
                        {verb.aux === 'être' && (
                          <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">être</span>
                        )}
                      </span>
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">{verbTranslation(verb, translationLang)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {index && (
        <VerbDialog
          verb={open}
          index={index}
          forms={open && allForms ? allForms[open.id] ?? null : null}
          examples={(open && allExamples?.[open.id]) || {}}
          languageCode={languageCode}
          translationLang={translationLang}
          onOpenChange={o => { if (!o) setOpen(null) }}
        />
      )}
    </div>
  )
}
