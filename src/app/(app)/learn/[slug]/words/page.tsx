'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { pickTranslation } from '@/lib/languages'
import { AppTopbar } from '@/components/layout/app-topbar'
import { WordSheet, type WordSheetEntry } from '@/components/lesson/word-sheet'

type RawWord = { word?: string; translation?: string; translations?: Record<string, string> }

/** Full-page list of a lesson's vocabulary (the page version of the "All words" dialog) */
export default function WordsPage() {
  const slug = useParams().slug as string
  const { languageCode, translationLang } = useActiveLanguage()
  const [title, setTitle] = useState('')
  const [words, setWords] = useState<WordSheetEntry[] | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: mod } = await supabase
        .from('modules')
        .select('id, title')
        .eq('slug', slug)
        .eq('language_code', languageCode)
        .limit(1)
        .maybeSingle()
      if (!mod) { setWords([]); return }
      setTitle(mod.title)

      const { data } = await supabase
        .from('lessons')
        .select('content')
        .eq('module_id', mod.id)
        .eq('type', 'vocabulary')
        .maybeSingle()
      const items = ((data?.content as { items?: RawWord[] } | null)?.items ?? [])
      setWords(items.map(i => ({ word: i.word ?? '', translation: pickTranslation(i, translationLang) })))
    }
    load()
  }, [slug, languageCode, translationLang])

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#1b2030]">
      <AppTopbar back={{ href: `/learn/${slug}/vocabulary`, label: 'Vocabulary' }} />
      <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-6xl mx-auto rounded-3xl bg-white dark:bg-[#202638] border border-black/[0.05] dark:border-white/[0.06] p-5 md:p-8">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{title || 'Words'}</h1>
            {words && <span className="text-xs font-semibold text-slate-400 tabular-nums">{words.length} words</span>}
          </div>
          {words === null ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : words.length === 0 ? (
            <p className="text-sm text-slate-400">No words in this lesson.</p>
          ) : (
            <WordSheet words={words} />
          )}
        </div>
      </main>
    </div>
  )
}
