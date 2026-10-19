'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppTopbar } from '@/components/layout/app-topbar'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { GrammarProvider } from '@/components/grammar/rich-text'
import { ExerciseSession } from '@/components/grammar/exercise-session'
import { useGrammarUser } from '@/components/grammar/use-grammar'
import { loadGrammarIndex, loadGrammarModule, type GrammarIndexEntry, type GrammarModule } from '@/lib/grammar'

/** /grammar/[slug]/practice?ex=<id>|mixed — one exercise (or the mixed review) full page */
export function GrammarPractice() {
  const t = useTranslations('grammar')
  const { slug } = useParams<{ slug: string }>()
  const exId = useSearchParams().get('ex') ?? 'mixed'
  const { languageCode } = useActiveLanguage()
  const { expl } = useGrammarUser()
  const [mod, setMod] = useState<GrammarModule | null | undefined>(undefined)
  const [modules, setModules] = useState<GrammarIndexEntry[]>([])

  useEffect(() => {
    if (!expl) return
    let cancelled = false
    Promise.all([loadGrammarModule(languageCode, slug, expl), loadGrammarIndex(languageCode, expl)]).then(([m, idx]) => {
      if (cancelled) return
      setMod(m)
      setModules(idx?.modules ?? [])
    })
    return () => { cancelled = true }
  }, [languageCode, slug, expl])

  const provider = useMemo(() => ({ languageCode, modules }), [languageCode, modules])
  const backHref = `/grammar/${slug}`
  const exists = mod && (exId === 'mixed' || mod.exercises.some(e => e.id === exId))

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar back={{ href: backHref, label: mod?.title ?? t('back'), subtle: true }} />
      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">
        {mod === undefined ? (
          <p className="py-20 text-center text-sm text-slate-400">{t('loading')}</p>
        ) : !exists ? (
          <p className="mx-auto max-w-xl rounded-3xl border border-dashed border-black/[0.08] p-10 text-center text-sm text-slate-500 dark:border-white/[0.1]">{t('not_found')}</p>
        ) : (
          <GrammarProvider value={provider}>
            <ExerciseSession key={exId} module={mod!} exId={exId} variant="page" backHref={backHref} />
          </GrammarProvider>
        )}
      </main>
    </div>
  )
}
