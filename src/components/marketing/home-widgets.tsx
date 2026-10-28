'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import { Check, Languages } from 'lucide-react'
import { getCopy, formatNumber } from '@/lib/marketing/copy'
import type { SiteLocale } from '@/lib/marketing/i18n'
import { SpeakButton } from './speak-button'
import { cn } from '@/lib/utils'

function CountUp({ value, locale }: { value: number; locale: SiteLocale }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 2,
      onUpdate(v) {
        if (ref.current) ref.current.textContent = formatNumber(locale, Math.round(v))
      },
    })
    return () => controls.stop()
  }, [inView, value, locale])

  // Server-rendered with the final number, so it reads right without JS
  return <span ref={ref}>{formatNumber(locale, value)}</span>
}

export function StatsBand({ locale, totals }: {
  locale: SiteLocale
  totals: { lessons: number; grammarModules: number; verbs: number; audioClips: number }
}) {
  const s = getCopy(locale).home.stats
  const items = [
    { value: totals.lessons, label: s.lessons },
    { value: totals.grammarModules, label: s.grammar },
    { value: totals.verbs, label: s.verbs },
    { value: totals.audioClips, label: s.audio },
  ]
  return (
    <section className="border-y border-primary/10 bg-white/50 dark:bg-slate-800/20">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-10 px-4 py-14 md:grid-cols-4 md:px-8 md:py-16">
        {items.map(item => (
          <div key={item.label} className="flex flex-col items-center px-2 text-center">
            <p className="mb-2 text-4xl font-bold tabular-nums text-primary md:text-5xl">
              <CountUp value={item.value} locale={locale} />
            </p>
            <p className="max-w-44 text-sm font-medium leading-snug text-slate-500 dark:text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** A Q&A card like the lesson player's: question in the course language, translation on demand */
export function QaDemo({ locale }: { locale: SiteLocale }) {
  const a = getCopy(locale).home.showcase.audio
  const [showTr, setShowTr] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  return (
    <div className="rounded-3xl border border-primary/10 bg-white p-6 shadow-xl shadow-primary/5 dark:border-white/[0.06] dark:bg-[#202638]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <SpeakButton text={a.question} lang={a.questionLang} className="text-lg font-bold leading-snug">
          {a.question}
        </SpeakButton>
      </div>
      <button
        type="button"
        onClick={() => setShowTr(v => !v)}
        className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1 text-xs font-bold text-primary"
      >
        <Languages size={12} />
        {a.showTranslation}
      </button>
      {showTr && <p className="-mt-2 mb-5 text-sm italic text-slate-500 dark:text-slate-400">{a.translation}</p>}
      <div className="flex flex-col gap-2">
        {a.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setPicked(i)}
            className={cn(
              'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors',
              picked === null && 'border-slate-200 hover:border-primary/40 dark:border-white/10',
              picked !== null && i === 0 && 'border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-400',
              picked === i && i !== 0 && 'border-red-400/40 bg-red-500/10 text-red-600 dark:text-red-400',
              picked !== null && picked !== i && i !== 0 && 'border-slate-200 opacity-50 dark:border-white/10',
            )}
          >
            {opt}
            {picked !== null && i === 0 && <Check size={16} />}
          </button>
        ))}
      </div>
    </div>
  )
}
