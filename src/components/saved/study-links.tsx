'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { ExternalLink, Link2, Loader2, Play, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useActiveLanguage } from '@/components/providers/language-provider'
import {
  LINK_CATEGORIES, PLATFORM_META, embedUrl, isPortrait, parseUrl,
  type LinkCategory, type LinkPlatform, type StudyLink,
} from '@/lib/study-links'

const CATEGORY_EMOJI: Record<LinkCategory, string> = {
  vocabulary: '📚', pronunciation: '🗣️', grammar: '🧩', tip: '💡', other: '✨',
}

type Draft = { url: string; platform: LinkPlatform; title: string; author: string | null; thumbnail_url: string | null }

function PlatformBadge({ platform, className }: { platform: LinkPlatform; className?: string }) {
  const meta = PLATFORM_META[platform]
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white', className)}
      style={{ background: meta.color }}
    >
      {meta.emoji} {meta.label}
    </span>
  )
}

function Thumb({ link, className }: { link: Pick<StudyLink, 'thumbnail_url' | 'platform'>; className?: string }) {
  const [broken, setBroken] = useState(false)
  const meta = PLATFORM_META[link.platform]
  if (!link.thumbnail_url || broken) {
    return (
      <div className={cn('flex items-center justify-center text-4xl', className)} style={{ background: `linear-gradient(135deg, ${meta.color}, #1f2433)` }}>
        {meta.emoji}
      </div>
    )
  }
  return (
    // Third-party thumbnails (YouTube/TikTok CDNs); next/image would need every host whitelisted
    // eslint-disable-next-line @next/next/no-img-element
    <img src={link.thumbnail_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn('object-cover', className)} />
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────

function AddLink({ onAdded }: { onAdded: (link: StudyLink) => void }) {
  const t = useTranslations('saved')
  const { languageCode } = useActiveLanguage()
  const [input, setInput] = useState('')
  const [fetching, setFetching] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [category, setCategory] = useState<LinkCategory>('tip')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    if (!parseUrl(input)) { toast.error(t('invalid_url')); return }
    setFetching(true)
    try {
      const res = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: input }),
      })
      if (!res.ok) { toast.error(t('invalid_url')); return }
      const p = (await res.json()) as Omit<Draft, 'title'> & { title: string | null }
      setDraft({ ...p, title: p.title ?? '' })
    } finally {
      setFetching(false)
    }
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('study_links')
      .insert({
        language_code: languageCode,
        url: draft.url,
        platform: draft.platform,
        title: draft.title.trim() || null,
        author: draft.author,
        thumbnail_url: draft.thumbnail_url,
        category,
        note: note.trim() || null,
      })
      .select('*')
      .single()
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505' ? t('duplicate') : t('save_error'))
      return
    }
    onAdded(data as StudyLink)
    toast.success(t('saved_ok'))
    setDraft(null); setInput(''); setNote(''); setCategory('tip')
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-[#202638] border border-black/[0.04] dark:border-white/[0.05] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <form onSubmit={lookup} className="flex gap-2">
        <div className="relative flex-1">
          <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setDraft(null) }}
            placeholder={t('paste_placeholder')}
            inputMode="url"
            className="w-full h-11 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-[#f6f4f2] dark:bg-white/[0.04] pl-10 pr-3 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || fetching}
          className="shrink-0 flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-primary text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform shadow-[0_3px_0_#c4612e]"
        >
          {fetching ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} strokeWidth={2.6} />}
          {fetching ? t('fetching') : t('add')}
        </button>
      </form>

      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 flex gap-4">
              <Thumb link={draft} className="w-28 h-20 shrink-0 rounded-xl" />
              <div className="flex-1 min-w-0 space-y-2">
                <PlatformBadge platform={draft.platform} />
                <input
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder={t('title_placeholder')}
                  maxLength={300}
                  className="w-full bg-transparent text-sm font-semibold border-b border-slate-200 dark:border-white/[0.1] pb-1 focus:outline-none focus:border-primary"
                />
                {draft.author && <p className="text-[11px] text-slate-400">@{draft.author}</p>}
              </div>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 mb-2">{t('category')}</p>
            <div className="flex flex-wrap gap-2">
              {LINK_CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                    category === c ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-primary/40',
                  )}
                >
                  {CATEGORY_EMOJI[c]} {t(`cat_${c}`)}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('note_placeholder')}
              maxLength={500}
              rows={2}
              className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-[#f6f4f2] dark:bg-white/[0.04] p-3 text-sm resize-none focus:outline-none focus:border-primary"
            />

            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setDraft(null)} className="h-10 px-4 rounded-2xl text-sm font-semibold text-slate-500">
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="h-10 px-5 rounded-2xl bg-primary text-white text-sm font-bold disabled:opacity-60 shadow-[0_3px_0_#c4612e] active:scale-95 transition-transform"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Player ────────────────────────────────────────────────────────────────────

function Player({ link, onClose }: { link: StudyLink; onClose: () => void }) {
  const t = useTranslations('saved')
  const src = embedUrl(link)
  const portrait = isPortrait(link)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className={cn('relative w-full rounded-3xl overflow-hidden bg-black shadow-2xl', portrait ? 'max-w-[380px]' : 'max-w-3xl')}
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 size-9 rounded-full bg-black/60 text-white flex items-center justify-center">
          <X size={16} />
        </button>
        {src ? (
          <iframe
            src={src}
            title={link.title ?? PLATFORM_META[link.platform].label}
            className={cn('w-full', portrait ? 'aspect-[9/16] max-h-[80vh]' : 'aspect-video')}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center text-white/60 text-sm">{t('untitled')}</div>
        )}
        <div className="flex items-center justify-between gap-3 bg-[#171b28] px-4 py-3">
          <p className="text-sm font-semibold text-white truncate">{link.title ?? t('untitled')}</p>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary">
            {t('open_in', { platform: PLATFORM_META[link.platform].label })} <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export function StudyLinks() {
  const t = useTranslations('saved')
  const locale = useLocale()
  const { languageCode } = useActiveLanguage()
  const [links, setLinks] = useState<StudyLink[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LinkCategory | 'all'>('all')
  const [playing, setPlaying] = useState<StudyLink | null>(null)

  const languageName = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }).of(languageCode) ?? languageCode,
    [locale, languageCode],
  )

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('study_links')
      .select('*')
      .eq('language_code', languageCode)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLinks((data ?? []) as StudyLink[])
        setLoading(false)
      })
  }, [languageCode])

  async function remove(id: string) {
    setLinks(prev => prev.filter(l => l.id !== id))
    await createClient().from('study_links').delete().eq('id', id)
    toast(t('removed'))
  }

  const usedCategories = LINK_CATEGORIES.filter(c => links.some(l => l.category === c))
  const visible = filter === 'all' ? links : links.filter(l => l.category === filter)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t('links_title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('links_subtitle', { language: languageName })}</p>
      </div>

      <AddLink onAdded={link => setLinks(prev => [link, ...prev])} />

      {usedCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', ...usedCategories] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all',
                filter === c ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-[#202638] text-slate-500 border-slate-200 dark:border-white/[0.08]',
              )}
            >
              {c === 'all' ? t('all') : `${CATEGORY_EMOJI[c]} ${t(`cat_${c}`)}`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12 gap-3">
          <div className="flex -space-x-2">
            {(['youtube', 'tiktok', 'instagram'] as const).map(p => (
              <span key={p} className="size-12 rounded-2xl flex items-center justify-center text-xl border-2 border-[#f6f4f2] dark:border-[#171b28]" style={{ background: PLATFORM_META[p].color }}>
                {PLATFORM_META[p].emoji}
              </span>
            ))}
          </div>
          <h2 className="font-bold text-lg">{t('empty_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t('empty_desc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence initial={false}>
            {visible.map(link => (
              <motion.article
                key={link.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group rounded-3xl overflow-hidden bg-white dark:bg-[#202638] border border-black/[0.04] dark:border-white/[0.05] shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
              >
                <button
                  onClick={() => embedUrl(link) ? setPlaying(link) : window.open(link.url, '_blank', 'noopener,noreferrer')}
                  className="relative block w-full aspect-video overflow-hidden"
                >
                  <Thumb link={link} className="size-full transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="size-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                      <Play size={20} className="text-slate-900 fill-slate-900 ml-0.5" />
                    </span>
                  </span>
                  <PlatformBadge platform={link.platform} className="absolute top-3 left-3" />
                </button>
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 min-w-0 text-sm font-bold leading-snug line-clamp-2">{link.title ?? t('untitled')}</p>
                    <button onClick={() => remove(link.id)} aria-label="Delete" className="shrink-0 p-1 text-slate-300 hover:text-rose-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-primary/10 text-primary font-semibold px-2 py-0.5">
                      {CATEGORY_EMOJI[link.category]} {t(`cat_${link.category}`)}
                    </span>
                    {link.author && <span className="text-slate-400 truncate">@{link.author}</span>}
                  </div>
                  {link.note && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{link.note}</p>}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {playing && <Player link={playing} onClose={() => setPlaying(null)} />}
      </AnimatePresence>
    </div>
  )
}
