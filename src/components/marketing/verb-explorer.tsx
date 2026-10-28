'use client'

import { useEffect, useState } from 'react'
import { getCopy } from '@/lib/marketing/copy'
import type { SiteLocale } from '@/lib/marketing/i18n'
import type { VerbShowcase } from '@/lib/marketing/data'
import { isImperativeTense, speakableForm } from '@/lib/verbs'
import { SpeakButton } from './speak-button'
import { cn } from '@/lib/utils'

export type VerbCourseTab = VerbShowcase & { flag: string }

/** Course tabs (?course=fr|es|en picks one), featured verbs, and the conjugation of the chosen tense */
export function VerbExplorer({ locale, courses }: { locale: SiteLocale; courses: VerbCourseTab[] }) {
  const c = getCopy(locale)
  const v = c.verbs
  const [code, setCode] = useState<string>(courses[0].code)
  const course = courses.find(x => x.code === code) ?? courses[0]
  const [verbId, setVerbId] = useState(course.featured[0].id)
  const [tenseKey, setTenseKey] = useState(course.moods[0].tenses[0].key)

  // Read after mount, so the page stays static and the default tab is in the HTML
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('course')
    const match = courses.find(x => x.code === requested)
    if (!match) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(match.code)
    setVerbId(match.featured[0].id)
    setTenseKey(match.moods[0].tenses[0].key)
  }, [courses])

  function pickCourse(next: VerbCourseTab) {
    setCode(next.code)
    setVerbId(next.featured[0].id)
    setTenseKey(next.moods[0].tenses[0].key)
  }

  const verb = course.featured.find(f => f.id === verbId) ?? course.featured[0]
  const forms = verb.forms[tenseKey] ?? []
  const persons = isImperativeTense(tenseKey) ? course.imperativePersons : course.persons
  const example = verb.examples[tenseKey]
  const tenseName = course.moods.flatMap(m => m.tenses.map(t => ({ ...t, mood: m.name }))).find(t => t.key === tenseKey)

  return (
    <div>
      <div role="tablist" className="mb-8 flex flex-wrap gap-2">
        {courses.map(x => (
          <button
            key={x.code}
            role="tab"
            type="button"
            aria-selected={x.code === course.code}
            onClick={() => pickCourse(x)}
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors',
              x.code === course.code
                ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                : 'border-primary/10 bg-white hover:border-primary/30 dark:border-white/10 dark:bg-[#202638]',
            )}
          >
            <span className="text-lg">{x.flag}</span>
            {c.courseNames[x.code]}
          </button>
        ))}
      </div>

      <dl className="mb-10 flex flex-wrap gap-x-10 gap-y-3">
        {[
          [course.total, v.stats.verbs],
          [course.irregular, v.stats.irregular],
          [course.tenses, v.stats.tenses],
        ].map(([n, label]) => (
          <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd className="text-3xl font-bold tabular-nums text-primary">{n}</dd>
            <dd className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{v.pickVerb}</p>
            <div className="flex flex-wrap gap-2">
              {course.featured.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setVerbId(f.id)}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-sm font-bold italic transition-colors',
                    f.id === verb.id ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/10 bg-white hover:border-primary/30 dark:border-white/10 dark:bg-[#202638]',
                  )}
                >
                  {f.infinitive}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{v.tense}</p>
            <div className="flex flex-col gap-4">
              {course.moods.map(mood => (
                <div key={mood.name}>
                  <p className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">{mood.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mood.tenses.map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTenseKey(t.key)}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                          t.key === tenseKey ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-primary/10 dark:bg-white/[0.06] dark:text-slate-300',
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-primary/10 bg-white p-6 shadow-xl shadow-primary/5 dark:border-white/[0.06] dark:bg-[#202638] md:p-8">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <SpeakButton text={verb.infinitive} lang={course.code} className="text-3xl font-black italic">{verb.infinitive}</SpeakButton>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{verb.translation}</p>
            </div>
            {tenseName && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{tenseName.mood} · {tenseName.name}</span>
            )}
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {forms.map((form, i) => form && (
              <li key={`${persons[i]}-${i}`}>
                <SpeakButton
                  text={speakableForm(form)}
                  lang={course.code}
                  className="w-full rounded-xl bg-slate-50 px-4 py-3 text-[15px] font-semibold dark:bg-white/[0.04]"
                >
                  {form}
                </SpeakButton>
              </li>
            ))}
          </ul>

          {example && (
            <div className="mt-6 border-t border-primary/8 pt-5 dark:border-white/[0.06]">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{v.example}</p>
              <SpeakButton text={example.text} lang={course.code} className="text-lg font-semibold">{example.text}</SpeakButton>
              {example.translation && <p className="mt-1 pl-[22px] text-sm text-slate-500 dark:text-slate-400">{example.translation}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
