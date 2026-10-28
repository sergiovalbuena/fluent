'use client'

import { useEffect, useState } from 'react'
import type { AbstractIntlMessages } from 'next-intl'
import { IntlProvider } from '@/components/providers/intl-provider'
import { GrammarBlockView } from '@/components/grammar/grammar-blocks'
import { GrammarProvider } from '@/components/grammar/rich-text'
import { getCopy } from '@/lib/marketing/copy'
import type { SiteLocale } from '@/lib/marketing/i18n'
import type { GrammarShowcase } from '@/lib/marketing/data'
import { LevelBadge } from './level-badge'
import { cn } from '@/lib/utils'

export type GrammarCourseTab = GrammarShowcase & { flag: string; explanation: SiteLocale }

/** Course tabs (?course=fr|es picks the first one), the module list by part, and one real section */
export function GrammarBrowser({ locale, courses, messages }: {
  locale: SiteLocale
  courses: GrammarCourseTab[]
  /** The app's `grammar` messages in each explanation language, for the block renderer */
  messages: Record<SiteLocale, AbstractIntlMessages>
}) {
  const c = getCopy(locale)
  const g = c.grammar
  const [picked, setPicked] = useState<string | null>(null)
  const active = courses.find(x => x.code === picked) ?? courses[0]

  // Read after mount, so the page stays static and the default tab is in the HTML
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('course')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (requested) setPicked(requested)
  }, [])
  const { index, sample } = active

  return (
    <>
      <div role="tablist" className="mb-10 flex flex-wrap gap-2">
        {courses.map(course => (
          <button
            key={course.code}
            role="tab"
            type="button"
            aria-selected={course.code === active.code}
            onClick={() => setPicked(course.code)}
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors',
              course.code === active.code
                ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                : 'border-primary/10 bg-white hover:border-primary/30 dark:border-white/10 dark:bg-[#202638]',
            )}
          >
            <span className="text-lg">{course.flag}</span>
            {c.courseNames[course.code]}
            <span className={cn('text-xs font-semibold', course.code === active.code ? 'text-white/70' : 'text-slate-400')}>
              · {g.modules(course.index.modules.length)}
            </span>
          </button>
        ))}
      </div>
      <p className="-mt-6 mb-10 text-sm font-medium text-slate-500 dark:text-slate-400">{g.explainedIn[active.explanation]}</p>

      <div className="flex flex-col gap-12">
        {index.parts.map(part => {
          const modules = index.modules.filter(m => m.part === part.number)
          if (!modules.length) return null
          return (
            <div key={part.number}>
              <div className="mb-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">{g.part(part.number)}</p>
                <h3 className="text-xl font-bold">{part.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{part.description}</p>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {modules.map(m => (
                  <li key={m.slug} className="flex items-start gap-4 rounded-2xl border border-primary/8 bg-white p-4 dark:border-white/[0.06] dark:bg-[#202638]">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-black text-indigo-600 dark:text-indigo-300">{m.number}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{m.title}</p>
                        <LevelBadge level={m.level} />
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{m.tagline}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {g.minutes(m.minutes)} · {g.exercises(m.exercises.length)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* One real section, rendered with the app's own components */}
      <div className="mt-20">
        <h2 className="text-3xl font-bold tracking-tight">{g.sampleTitle}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{g.sampleSub}</p>
        <div className="mt-8 rounded-3xl border border-primary/10 bg-white p-6 shadow-xl shadow-primary/5 dark:border-white/[0.06] dark:bg-[#202638] md:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-400">{sample.moduleTitle}</p>
            <LevelBadge level={sample.level} />
          </div>
          <h3 className="mb-5 text-2xl font-bold">{sample.section.title}</h3>
          <IntlProvider locale={active.explanation} messages={messages[active.explanation]}>
            <GrammarProvider value={{ languageCode: active.code, modules: [] }}>
              <div className="flex flex-col gap-5">
                {sample.section.blocks.map((block, i) => <GrammarBlockView key={i} block={block} />)}
              </div>
            </GrammarProvider>
          </IntlProvider>
        </div>
      </div>
    </>
  )
}
