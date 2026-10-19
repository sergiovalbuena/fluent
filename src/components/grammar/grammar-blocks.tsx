'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Info, Lightbulb, Play, Square, Volume2 } from 'lucide-react'
import { speak, stopSpeaking } from '@/lib/languages'
import { plain, type GrammarBlock } from '@/lib/grammar'
import { cn } from '@/lib/utils'
import { Highlighted, Rich, useGrammarContext } from './rich-text'

const CALLOUT = {
  tip: { icon: Lightbulb, box: 'bg-indigo-500/[0.06] border-indigo-500/15', icon_: 'text-indigo-500', title: 'text-indigo-700 dark:text-indigo-300' },
  warning: { icon: AlertTriangle, box: 'bg-amber-500/[0.07] border-amber-500/20', icon_: 'text-amber-500', title: 'text-amber-800 dark:text-amber-300' },
  note: { icon: Info, box: 'bg-slate-500/[0.05] border-black/[0.05] dark:border-white/[0.06]', icon_: 'text-slate-400', title: 'text-slate-700 dark:text-slate-200' },
} as const

export function GrammarBlockView({ block }: { block: GrammarBlock }) {
  const { languageCode } = useGrammarContext()

  switch (block.type) {
    case 'text':
      return <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300"><Rich text={block.text} /></p>

    case 'list':
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span className="min-w-0"><Rich text={item} /></span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      return (
        <figure className="flex flex-col gap-2">
          {block.caption && (
            <figcaption className="px-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"><Rich text={block.caption} /></figcaption>
          )}
          <div className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.07]">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.03]">
                  {block.head.map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {h && <Rich text={h} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {block.rows.map((row, r) => (
                  <tr key={r} className="align-top transition-colors hover:bg-indigo-500/[0.025]">
                    {row.map((cell, c) => (
                      <td key={c} className={cn('px-4 py-2.5 leading-relaxed text-slate-600 dark:text-slate-300', c === 0 && 'text-slate-800 dark:text-slate-100')}>
                        {!cell ? null : FR_ONLY.test(cell) ? <FrCell text={cell.slice(1, -1)} /> : <Rich text={cell} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      )

    case 'callout': {
      const style = CALLOUT[block.tone]
      const Icon = style.icon
      return (
        <aside className={cn('flex gap-3 rounded-2xl border px-4 py-3.5', style.box)}>
          <Icon size={17} className={cn('mt-0.5 shrink-0', style.icon_)} />
          <div className="min-w-0 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            {block.title && <p className={cn('mb-0.5 font-bold', style.title)}>{block.title}</p>}
            <p><Rich text={block.text} /></p>
          </div>
        </aside>
      )
    }

    case 'examples':
      return (
        <ul className="flex flex-col divide-y divide-black/[0.04] overflow-hidden rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.07]">
          {block.items.map((ex, i) => (
            <li key={i} className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-indigo-500/[0.04] sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => speak(plain(ex.fr), languageCode)}
                className="group flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
                  <Volume2 size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold italic text-slate-900 dark:text-white"><Highlighted text={ex.fr} /></span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">{ex.tr}</span>
                </span>
              </button>
              {ex.note && (
                <span className="ml-10 self-start rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400 sm:ml-0 sm:self-center">
                  <Rich text={ex.note} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )

    case 'sounds':
      return <SoundCards items={block.items} />

    case 'conjugation':
      return <VerbCards persons={block.persons} verbs={block.verbs} />

    case 'formula':
      return (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] to-primary/[0.06] px-5 py-5 text-center">
          <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white md:text-xl"><Highlighted text={block.text} /></p>
          {block.caption && <p className="text-sm text-slate-500 dark:text-slate-400"><Rich text={block.caption} /></p>}
        </div>
      )
  }
}

/** A table cell that is only French: shown as a play button */
const FR_ONLY = /^\*[^*]+\*$/

function FrCell({ text }: { text: string }) {
  const { languageCode } = useGrammarContext()
  return (
    <button
      type="button"
      onClick={() => speak(plain(text), languageCode)}
      className="group -mx-1.5 inline-flex items-start gap-1.5 rounded-lg px-1.5 py-0.5 text-left font-medium italic text-slate-900 transition-colors hover:bg-indigo-500/[0.08] dark:text-white"
    >
      <Volume2 size={13} className="mt-[3px] shrink-0 not-italic text-indigo-400 transition-colors group-hover:text-indigo-600" />
      <span><Highlighted text={text} /></span>
    </button>
  )
}

type SoundItem = { label: string; ipa?: string; hint: string; examples: string[] }

/** Sound cards: the spelling big, its sound, a hint and words to listen to */
function SoundCards({ items }: { items: SoundItem[] }) {
  const { languageCode } = useGrammarContext()
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {items.map(item => (
        <div key={item.label} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-gradient-to-br from-indigo-500/[0.04] to-transparent p-4 dark:border-white/[0.07]">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => speak(item.examples[0], languageCode)}
              aria-label={item.examples[0]}
              className="flex h-14 min-w-14 shrink-0 items-center justify-center rounded-2xl bg-white px-3 text-xl font-black tracking-tight text-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.12)] transition hover:scale-105 active:scale-95 dark:bg-[#2a3148] dark:text-indigo-300"
            >
              {item.label}
            </button>
            <div className="min-w-0 pt-0.5">
              {item.ipa && <p className="font-mono text-xs font-bold text-indigo-500">{item.ipa}</p>}
              <p className="text-sm leading-snug text-slate-600 dark:text-slate-300"><Rich text={item.hint} /></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.examples.map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => speak(ex, languageCode)}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-sm font-semibold italic text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:bg-indigo-500 hover:text-white dark:bg-white/[0.06] dark:text-slate-100"
              >
                <Volume2 size={12} className="not-italic text-indigo-400 group-hover:text-white" />
                {ex}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

type VerbCard = { verb: string; meaning: string; forms: string[]; notes?: string[] }

/** One card per verb; each form plays on tap, and the whole verb can be played in a row */
function VerbCards({ persons, verbs }: { persons: string[]; verbs: VerbCard[] }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2.5', verbs.length > 1 && 'sm:grid-cols-2')}>
      {verbs.map(v => <VerbCardView key={v.verb} persons={persons} verb={v} />)}
    </div>
  )
}

function VerbCardView({ persons, verb }: { persons: string[]; verb: VerbCard }) {
  const t = useTranslations('grammar')
  const { languageCode } = useGrammarContext()
  const [playing, setPlaying] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopped = useRef(false)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function playFrom(i: number) {
    if (stopped.current || i >= verb.forms.length) { setPlaying(null); return }
    setPlaying(i)
    speak(plain(verb.forms[i]), languageCode, {
      onEnd: () => { timer.current = setTimeout(() => playFrom(i + 1), 450) },
    })
  }

  function toggleAll() {
    if (playing !== null) {
      stopped.current = true
      if (timer.current) clearTimeout(timer.current)
      stopSpeaking()
      setPlaying(null)
      return
    }
    stopped.current = false
    playFrom(0)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.07]">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/[0.08] to-primary/[0.05] px-4 py-3">
        <div className="min-w-0">
          <button type="button" onClick={() => speak(verb.verb, languageCode)} className="text-lg font-black italic leading-tight text-slate-900 hover:text-indigo-600 dark:text-white">
            {verb.verb}
          </button>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{verb.meaning}</p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className={cn(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors',
            playing !== null ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 dark:bg-white/[0.08] dark:text-indigo-300',
          )}
        >
          {playing !== null ? <Square size={10} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
          {playing !== null ? t('stop') : t('listen_all')}
        </button>
      </div>
      <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
        {verb.forms.map((form, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => speak(plain(form), languageCode)}
              className={cn(
                'group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-indigo-500/[0.04]',
                playing === i && 'bg-indigo-500/[0.08]',
              )}
            >
              <span className="w-24 shrink-0 text-[11px] font-semibold text-slate-400">{persons[i]}</span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold italic text-slate-900 dark:text-white"><Highlighted text={form} /></span>
              {verb.notes?.[i] && <span className="hidden shrink-0 text-xs text-slate-400 sm:block"><Rich text={verb.notes[i]} /></span>}
              <Volume2 size={13} className={cn('shrink-0 transition-colors', playing === i ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-500 dark:text-slate-600')} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
