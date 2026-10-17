'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Square, ZoomIn, ZoomOut } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { WordSheet, type WordSheetEntry } from '@/components/lesson/word-sheet'
import { speak, type SpeechHandle } from '@/lib/languages'
import { cn } from '@/lib/utils'

const ZOOM_MIN  = 0.8
const ZOOM_MAX  = 1.6
const ZOOM_STEP = 0.2
/** Pause between items when listening to all of them */
const GAP_MS = 1500

const iconButton = 'size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors'

/** Every item of a lesson section in one view, with zoom and "listen to all" */
export function AllItemsDialog({ open, onOpenChange, title, description, entries, languageCode, columns = 2 }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: string
  entries: WordSheetEntry[]
  languageCode: string
  /** Short items (words) fit in two columns; sentences read better in one */
  columns?: 1 | 2
}) {
  const t = useTranslations('lesson')
  const [zoom, setZoom] = useState(1)
  const [current, setCurrent] = useState<number | null>(null)
  // Each "listen to all" run gets an id, so a stopped run can't schedule the next item
  const runRef = useRef(0)
  const speechRef = useRef<SpeechHandle | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function stop() {
    runRef.current++
    if (timerRef.current) clearTimeout(timerRef.current)
    speechRef.current?.stop()
    speechRef.current = null
    setCurrent(null)
  }

  function playFrom(index: number, run: number) {
    if (run !== runRef.current) return
    if (index >= entries.length) { setCurrent(null); return }
    setCurrent(index)
    speechRef.current = speak(entries[index].word, languageCode, {
      onEnd: () => {
        if (run !== runRef.current) return
        timerRef.current = setTimeout(() => playFrom(index + 1, run), GAP_MS)
      },
    })
  }

  function playAll() {
    stop()
    playFrom(0, runRef.current)
  }

  // Stop reading when the dialog closes or the page unmounts
  function handleOpenChange(next: boolean) {
    if (!next) stop()
    onOpenChange(next)
  }
  useEffect(() => () => {
    runRef.current++
    if (timerRef.current) clearTimeout(timerRef.current)
    speechRef.current?.stop()
  }, [])

  const playing = current != null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-5 md:p-6"
        style={{ maxWidth: `min(calc(100% - 2rem), ${512 * zoom}px)` }}
      >
        <DialogHeader className="flex-row items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <DialogTitle className="font-bold leading-tight" style={{ fontSize: 20 * zoom }}>{title}</DialogTitle>
            <DialogDescription className="mt-1">{description}</DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={playing ? stop : playAll}
              className={cn(
                'h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors',
                playing ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/15',
              )}
            >
              {playing ? <Square size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
              {playing ? t('listen_stop') : t('listen_all')}
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
              className={iconButton}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
              className={iconButton}
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </DialogHeader>
        <WordSheet
          words={entries}
          zoom={zoom}
          activeIndex={current}
          className={columns === 2 ? 'columns-2 lg:columns-2 gap-x-6' : 'columns-1 sm:columns-1 lg:columns-1'}
        />
      </DialogContent>
    </Dialog>
  )
}
