'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, Check, ChevronDown, GraduationCap, Layers, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { savePracticeSource, usePracticeContent } from '@/lib/practice-source'
import { cn } from '@/lib/utils'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * "Practice with: …" — where the mini-games take their words from. tone="dark"
 * for the games' dark screens.
 */
export function SourcePicker({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const t = useTranslations('practice_source')
  const { languageCode, translationLang } = useActiveLanguage()
  const content = usePracticeContent(languageCode, translationLang)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const totalWords = content.lessons.reduce((s, l) => s + l.words, 0)
  const totalPhrases = content.lessons.reduce((s, l) => s + l.phrases, 0)
  const visible = useMemo(() => {
    const q = norm(query.trim())
    const list = [...content.lessons].reverse()   // latest lessons first: what you're studying now
    return q ? list.filter(l => norm(`${l.position} ${l.title}`).includes(q)) : list
  }, [content.lessons, query])

  const chosen = content.sourceLessons
  const chosenSlugs = new Set(chosen.map(l => l.slug))
  const label = content.loading
    ? t('loading')
    : chosen.length === 1
      ? `${t('lesson', { n: chosen[0].position })} · ${chosen[0].title}`
      : chosen.length > 1
        ? t('n_lessons', { n: chosen.length, words: content.words.length })
        : t('all')

  // Lessons toggle on and off; none selected means all of them
  function toggle(slug: string) {
    const next = new Set(chosenSlugs)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    savePracticeSource(languageCode, next.size ? { kind: 'lessons', slugs: [...next] } : { kind: 'all' })
  }

  function chooseAll() {
    savePracticeSource(languageCode, { kind: 'all' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={content.loading}
        className={cn(
          'group inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:opacity-60',
          tone === 'dark'
            ? 'bg-white/[0.07] text-white ring-1 ring-white/10 hover:bg-white/[0.12]'
            : 'bg-white text-slate-800 ring-1 ring-black/[0.08] hover:ring-primary/40 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/[0.1]',
          className,
        )}
      >
        {chosen.length ? <BookOpen size={15} className="shrink-0 text-primary" /> : <Layers size={15} className="shrink-0 text-primary" />}
        <span className="min-w-0">
          <span className={cn('block text-[10px] font-bold uppercase tracking-widest', tone === 'dark' ? 'text-white/45' : 'text-slate-400')}>{t('label')}</span>
          <span className="block truncate font-semibold">{label}</span>
        </span>
        <ChevronDown size={15} className="ml-1 shrink-0 opacity-50 transition-transform group-hover:translate-y-0.5" />
      </DialogTrigger>

      <DialogContent className="flex h-[min(80vh,620px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-1 px-5 pt-5 pb-3">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-5 pb-3">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('search')}
              className="h-10 w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] pl-9 pr-3 text-sm focus:border-primary/50 focus:outline-none"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {!query && (
            <>
              <Option
                active={chosen.length === 0}
                icon={<Layers size={16} />}
                title={t('all')}
                hint={t('counts', { words: totalWords, phrases: totalPhrases })}
                onClick={chooseAll}
              />
              <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 opacity-50" aria-disabled>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500"><GraduationCap size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t('grammar')}</span>
                  <span className="block text-xs text-slate-500">{t('grammar_hint')}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/[0.06]">{t('soon')}</span>
              </div>
              <p className="flex items-baseline justify-between gap-2 px-2.5 pb-1 pt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lessons')}</span>
                <span className="text-[11px] text-slate-400">{t('pick_several')}</span>
              </p>
            </>
          )}
          {visible.map(l => (
            <Option
              key={l.slug}
              multi
              active={chosenSlugs.has(l.slug)}
              icon={<span className="text-xs font-black tabular-nums">{l.position}</span>}
              title={l.title}
              hint={t('counts', { words: l.words, phrases: l.phrases })}
              onClick={() => toggle(l.slug)}
            />
          ))}
          {visible.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">{t('no_results')}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.05] dark:border-white/[0.06] px-5 py-3">
          <span className="min-w-0 truncate text-xs text-slate-500">
            {chosen.length ? t('selected', { n: chosen.length, words: content.words.length, phrases: content.phrases.length }) : t('counts', { words: totalWords, phrases: totalPhrases })}
          </span>
          <button type="button" onClick={() => { setOpen(false); setQuery('') }} className="h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-white">
            {t('done')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A row in the list; multi = checkbox look (lessons can be combined) */
function Option({ active, icon, title, hint, onClick, multi }: { active: boolean; icon: React.ReactNode; title: string; hint: string; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
        active ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]',
      )}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-white' : 'bg-primary/10 text-primary')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
      {multi ? (
        <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors', active ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-white/20')}>
          {active && <Check size={12} strokeWidth={3} />}
        </span>
      ) : active && <Check size={16} className="shrink-0 text-primary" />}
    </button>
  )
}
