'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { AppTopbar } from '@/components/layout/app-topbar'
import { Bookmark, Trash2, ArrowRight, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SavedItem = {
  id: string
  language_code: string
  type: 'word' | 'phrase' | 'story_word'
  original: string
  translation: string
  created_at: string
}

const TYPE_LABELS: Record<SavedItem['type'], string> = {
  word:       'Word',
  phrase:     'Phrase',
  story_word: 'Story Word',
}

const TYPE_COLORS: Record<SavedItem['type'], string> = {
  word:       'bg-primary/10 text-primary border-primary/20',
  phrase:     'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  story_word: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

// ── Flashcard practice mode ────────────────────────────────────────────────────

function FlashcardMode({ items, onClose }: { items: SavedItem[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)

  const current = items[index]

  function next() {
    setFlipped(false)
    setTimeout(() => {
      if (index + 1 >= items.length) setDone(true)
      else setIndex(i => i + 1)
    }, 150)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 flex-1 py-16 px-6 text-center">
        <span className="text-6xl">🎉</span>
        <div>
          <h2 className="text-2xl font-bold">All done!</h2>
          <p className="text-muted-foreground text-sm mt-1">You reviewed {items.length} items</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setDone(false) }}
            className="w-full flex items-center justify-center gap-2 h-12 bg-primary text-white font-bold rounded-2xl active:scale-95 transition-transform"
          >
            <RotateCcw size={15} /> Practice again
          </button>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold active:scale-95 transition-transform"
          >
            Back to list
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6 gap-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors">
          <X size={20} />
        </button>
        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((index) / items.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs font-bold text-slate-400 tabular-nums">{index + 1} / {items.length}</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <span className={cn('text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border', TYPE_COLORS[current.type])}>
          {TYPE_LABELS[current.type]}
        </span>

        <motion.div
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-sm bg-white dark:bg-[#2c1a12] rounded-3xl border border-black/[0.05] dark:border-white/[0.06] p-8 text-center cursor-pointer select-none shadow-[0_4px_20px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform min-h-[200px] flex flex-col items-center justify-center gap-3"
        >
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{current.original}</p>
          <AnimatePresence>
            {flipped && current.translation && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                <div className="w-12 h-px bg-slate-200 dark:bg-slate-700 mx-auto" />
                <p className="text-lg text-muted-foreground font-medium">{current.translation}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!flipped && (
            <p className="text-xs text-slate-400">Tap to reveal</p>
          )}
        </motion.div>

        <button
          onClick={next}
          className="flex items-center gap-2 bg-primary text-white font-bold px-8 h-12 rounded-2xl active:scale-95 transition-transform shadow-sm shadow-primary/25 mt-2"
        >
          {index + 1 < items.length ? <><ArrowRight size={16} /> Next</> : <><RotateCcw size={15} /> Finish</>}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | SavedItem['type']>('all')
  const [practicing, setPracticing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase
        .from('saved_items')
        .select('id, language_code, type, original, translation, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setItems((data ?? []) as SavedItem[])
          setLoading(false)
        })
    })
  }, [])

  async function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    const supabase = createClient()
    await supabase.from('saved_items').delete().eq('id', id)
    toast('Removed from saved')
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const counts = {
    all:        items.length,
    word:       items.filter(i => i.type === 'word').length,
    phrase:     items.filter(i => i.type === 'phrase').length,
    story_word: items.filter(i => i.type === 'story_word').length,
  }

  if (practicing) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
        <AppTopbar title="Practice" back={{ href: '/saved' }} />
        <FlashcardMode items={filtered.length > 0 ? filtered : items} onClose={() => setPracticing(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Saved" />

      <main className="flex-1 px-4 py-5 pb-28 md:pb-8 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold">Saved Items</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{items.length} items saved</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => setPracticing(true)}
              className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-xl text-sm active:scale-95 transition-transform shadow-sm shadow-primary/25"
            >
              <RotateCcw size={14} /> Practice
            </button>
          )}
        </div>

        {/* Filters */}
        {items.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
            {([
              { key: 'all', label: 'All' },
              { key: 'word', label: 'Words' },
              { key: 'phrase', label: 'Phrases' },
              { key: 'story_word', label: 'Story' },
            ] as const).map(({ key, label }) => (
              counts[key] > 0 && (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all',
                    filter === key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-[#2c1a12] text-slate-500 border-slate-200 dark:border-white/[0.08] hover:border-primary/40'
                  )}
                >
                  {label}
                  <span className={cn('text-[11px] font-bold', filter === key ? 'text-white/70' : 'text-slate-400')}>
                    {counts[key]}
                  </span>
                </button>
              )
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bookmark size={28} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Nothing saved yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                Tap the 🔖 icon on any word, phrase, or story word to save it here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filtered.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white dark:bg-[#2c1a12] rounded-2xl border border-black/[0.04] dark:border-white/[0.05] px-4 py-3.5 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{item.original}</p>
                    {item.translation && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.translation}</p>
                    )}
                  </div>
                  <span className={cn('shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border', TYPE_COLORS[item.type])}>
                    {TYPE_LABELS[item.type]}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
