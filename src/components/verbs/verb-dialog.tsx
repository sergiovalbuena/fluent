'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen, Quote, Volume2, X, Zap } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { speak } from '@/lib/languages'
import { speakableForm, verbTranslation, type VerbEntry, type VerbExamples, type VerbForms, type VerbIndex } from '@/lib/verbs'
import { cn } from '@/lib/utils'

/** The sentence with the verb form highlighted */
function HighlightedSentence({ text, match }: { text: string; match: string }) {
  const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^\\p{L}])(${escaped})(?=[^\\p{L}]|$)`, 'iu')
  const m = re.exec(text)
  if (!m) return <>{text}</>
  const start = m.index + m[1].length
  const end = start + m[2].length
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-primary/15 px-0.5 font-bold text-primary">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  )
}

/** Full conjugation of one verb: a tab per mood, a card per tense */
export function VerbDialog({ verb, index, forms, examples, languageCode, translationLang, onOpenChange }: {
  verb: VerbEntry | null
  index: VerbIndex
  /** Conjugations of this verb; null while they load */
  forms: VerbForms | null
  /** An example sentence per tense */
  examples: VerbExamples
  languageCode: string
  translationLang: string
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('verbs')
  const [moodIdx, setMoodIdx] = useState(0)
  // Tense whose example is shown above the tenses
  const [exampleTense, setExampleTense] = useState<string | null>(null)

  // Only moods with at least one tense this verb has (pouvoir has no imperative)
  const moods = index.moods
    .map(m => ({ ...m, tenses: m.tenses.filter(tense => forms?.[tense.key]) }))
    .filter(m => m.tenses.length > 0)
  const mood = moods[Math.min(moodIdx, Math.max(moods.length - 1, 0))]

  return (
    <Dialog open={verb != null} onOpenChange={open => { if (!open) { setMoodIdx(0); setExampleTense(null) } onOpenChange(open) }}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col sm:max-w-2xl h-[min(80vh,680px)] overflow-hidden p-0 gap-0"
      >
        {verb && (
          <>
            {/* Header */}
            <DialogHeader className="shrink-0 gap-2.5 border-b border-black/[0.05] dark:border-white/[0.06] px-4 md:px-6 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={t('listen')}
                  onClick={() => speak(verb.infinitive, languageCode)}
                  className="size-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/15 active:scale-95 transition"
                >
                  <Volume2 size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-xl font-bold leading-tight">{verb.infinitive}</DialogTitle>
                  <DialogDescription className="truncate text-sm">{verbTranslation(verb, translationLang)}</DialogDescription>
                </div>
                <DialogClose
                  aria-label="Close"
                  className="size-9 shrink-0 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.08] dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </DialogClose>
              </div>

              <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold">
                {verb.aux && (
                  <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-slate-600 dark:text-slate-300">
                    {t('aux', { aux: verb.aux })}
                  </span>
                )}
                {verb.participles.present && (
                  <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-slate-600 dark:text-slate-300">
                    {index.participleLabels.present}: <span className="text-slate-900 dark:text-white">{verb.participles.present}</span>
                  </span>
                )}
                {verb.participles.past && (
                  <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-slate-600 dark:text-slate-300">
                    {index.participleLabels.past}: <span className="text-slate-900 dark:text-white">{verb.participles.past}</span>
                  </span>
                )}
                {verb.slug && (
                  <Link
                    href={`/learn/${verb.slug}`}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary hover:bg-primary/15 transition-colors"
                  >
                    <BookOpen size={11} />
                    {t('appears_in', { n: verb.lesson })}
                  </Link>
                )}
                <Link
                  href={`/verbs/practice?verb=${encodeURIComponent(verb.id)}`}
                  className="ml-auto flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-white hover:opacity-90 transition-opacity"
                >
                  <Zap size={11} />
                  {t('practice_verb')}
                </Link>
              </div>

              {/* Mood tabs */}
              {moods.length > 0 && (
                <div role="tablist" className="flex gap-1 overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
                  {moods.map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      role="tab"
                      aria-selected={m === mood}
                      onClick={() => { setMoodIdx(i); setExampleTense(null) }}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors',
                        m === mood
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]',
                      )}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </DialogHeader>

            {/* Tenses */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4">
              {/* Example of the selected tense — sticks to the top while scrolling */}
              {exampleTense && examples[exampleTense] && (() => {
                const ex = examples[exampleTense]
                const translation = ex.translations[translationLang] ?? ex.translations.en ?? ex.translations.es
                const tenseName = mood?.tenses.find(tn => tn.key === exampleTense)?.name
                return (
                  <div className="sticky top-0 z-10 -mx-1 mb-3 px-1 pb-1 bg-background">
                    <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
                      <button
                        type="button"
                        aria-label={t('listen')}
                        onClick={() => speak(ex.text, languageCode)}
                        className="size-7 shrink-0 rounded-lg bg-white dark:bg-white/[0.08] text-primary flex items-center justify-center shadow-sm hover:bg-primary/10 active:scale-95 transition"
                      >
                        <Volume2 size={13} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{tenseName}</p>
                        <p className="text-sm font-medium leading-snug text-slate-900 dark:text-white">
                          <HighlightedSentence text={ex.text} match={ex.match} />
                        </p>
                        {translation && <p className="text-xs text-slate-500 dark:text-slate-400">{translation}</p>}
                      </div>
                      <button
                        type="button"
                        aria-label={t('hide_example')}
                        onClick={() => setExampleTense(null)}
                        className="size-7 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )
              })()}
              {!forms ? (
                <p className="py-10 text-center text-sm text-slate-400">{t('loading')}</p>
              ) : mood ? (
                <>
                  <p className="mb-2.5 text-[11px] text-slate-400">{t('tap_to_listen')}</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {mood.tenses.map(tense => {
                      const imperative = forms[tense.key].length === 3
                      return (
                        <section key={tense.key} className="rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] px-3 py-2.5">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">{tense.name}</h3>
                            {examples[tense.key] && (
                              <button
                                type="button"
                                aria-pressed={exampleTense === tense.key}
                                onClick={() => setExampleTense(cur => (cur === tense.key ? null : tense.key))}
                                className={cn(
                                  'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                                  exampleTense === tense.key
                                    ? 'bg-primary text-white'
                                    : 'text-primary/80 hover:bg-primary/10 hover:text-primary',
                                )}
                              >
                                <Quote size={10} />
                                {t('example')}
                              </button>
                            )}
                          </div>
                          <ul className="space-y-0.5">
                            {forms[tense.key].map((form, i) => (
                              <li key={i}>
                                {form ? (
                                  <button
                                    type="button"
                                    onClick={() => speak(speakableForm(form), languageCode)}
                                    className="group flex w-full items-baseline gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 text-left hover:bg-white dark:hover:bg-white/[0.05] transition-colors"
                                  >
                                    {imperative && (
                                      <span className="w-14 shrink-0 text-[11px] text-slate-400">{index.imperativePersons[i]}</span>
                                    )}
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{form}</span>
                                    <Volume2 size={12} className="ml-auto shrink-0 self-center text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ) : (
                                  <span className="block px-1.5 py-0.5 -mx-1.5 text-sm text-slate-300 dark:text-slate-600">{t('not_used')}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )
                    })}
                  </div>
                  {index.note && verb.aux === 'être' && (
                    <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">{index.note}</p>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
