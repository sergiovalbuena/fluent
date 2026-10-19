'use client'

import { createContext, useContext } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { speak } from '@/lib/languages'
import { highlights, plain, tokenize, type GrammarIndexEntry } from '@/lib/grammar'
import { cn } from '@/lib/utils'

type GrammarContextValue = { languageCode: string; modules: GrammarIndexEntry[] }

const GrammarContext = createContext<GrammarContextValue>({ languageCode: 'fr', modules: [] })

export function GrammarProvider({ value, children }: { value: GrammarContextValue; children: React.ReactNode }) {
  return <GrammarContext.Provider value={value}>{children}</GrammarContext.Provider>
}

export const useGrammarContext = () => useContext(GrammarContext)

/** French text with its {highlighted} parts */
export function Highlighted({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {highlights(text).map((p, i) =>
        p.hl ? <span key={i} className={cn('font-bold text-primary', className)}>{p.text}</span> : <span key={i}>{p.text}</span>,
      )}
    </>
  )
}

/** French phrase: italic, read aloud on click */
export function Fr({ text }: { text: string }) {
  const { languageCode } = useGrammarContext()
  const say = () => speak(plain(text), languageCode)
  // A span, not a button: a button is an atomic box and breaks lines badly around punctuation
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={say}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); say() } }}
      className="cursor-pointer rounded-[4px] font-medium italic text-slate-900 underline decoration-indigo-400/50 decoration-dotted decoration-[1.5px] underline-offset-[4px] transition-colors hover:bg-indigo-500/[0.08] hover:decoration-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-400 dark:text-white"
    >
      <Highlighted text={text} />
    </span>
  )
}

function ModuleLink({ number }: { number: number }) {
  const t = useTranslations('grammar')
  const { modules } = useGrammarContext()
  const target = modules.find(m => m.number === number)
  if (!target) return <span>{t('see_module', { n: number })}</span>
  return (
    <Link
      href={`/grammar/${target.slug}`}
      title={target.title}
      className="inline-flex translate-y-[-1px] items-center gap-1 whitespace-nowrap rounded-full bg-indigo-500/10 px-2 py-0.5 align-middle text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-500/20 dark:text-indigo-300"
    >
      {t('see_module', { n: number })}
      <span className="max-w-40 truncate font-semibold opacity-70">· {target.title}</span>
    </Link>
  )
}

/** Text with the grammar markup: *français*, **bold**, [[n]] */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((tok, i) => {
        switch (tok.kind) {
          case 'fr': return <Fr key={i} text={tok.text} />
          case 'bold': return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{tok.text}</strong>
          case 'link': return <ModuleLink key={i} number={tok.module} />
          default: return <span key={i}>{tok.text}</span>
        }
      })}
    </>
  )
}
