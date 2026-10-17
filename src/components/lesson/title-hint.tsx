'use client'

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Popover } from '@base-ui/react/popover'
import { sectionTitle, type SectionTitleKey } from '@/lib/section-titles'
import { cn } from '@/lib/utils'

type TitleHintSettings = {
  /** Language being learned: titles are shown in it */
  lang: string
  /** Learner's native language: the hint translates into it */
  hintLang: string
  /** Hints are on for this lesson (setting enabled and lesson within the chosen range) */
  active: boolean
}

const TitleHintContext = createContext<TitleHintSettings>({ lang: 'en', hintLang: 'en', active: false })

export const TitleHintProvider = TitleHintContext.Provider

/**
 * Marks the element whose hover shows the hints of the titles inside it (a card,
 * a tab, a list header). Spread it on that element: `<div {...HINT_AREA}>`.
 */
export const HINT_AREA = { 'data-title-hint-area': '' }

const CLOSE_DELAY_MS = 80

// Hints need hover, so they're desktop-only: touch screens show the plain title
const HOVER_QUERY = '(hover: hover) and (pointer: fine)'
function subscribeHover(onChange: () => void) {
  const mq = window.matchMedia(HOVER_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const canHover = () => window.matchMedia(HOVER_QUERY).matches

/**
 * A lesson section title in the language being learned. While hints are active,
 * hovering its card (the closest HINT_AREA) shows the title in the learner's
 * native language. Desktop only.
 */
export function SectionTitle({ k, className }: { k: SectionTitleKey; className?: string }) {
  const { lang, hintLang, active } = useContext(TitleHintContext)
  const title = sectionTitle(k, lang)
  const hint = sectionTitle(k, hintLang)
  const hasHover = useSyncExternalStore(subscribeHover, canHover, () => false)
  const enabled = active && hasHover && hint !== title

  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const area = el.closest<HTMLElement>('[data-title-hint-area]') ?? el
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    const enter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(closeTimer)
      setOpen(true)
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      closeTimer = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
    }
    area.addEventListener('pointerenter', enter)
    area.addEventListener('pointerleave', leave)
    return () => {
      clearTimeout(closeTimer)
      area.removeEventListener('pointerenter', enter)
      area.removeEventListener('pointerleave', leave)
    }
  }, [enabled])

  if (!enabled) return <span className={className}>{title}</span>

  return (
    <Popover.Root open={open} onOpenChange={next => { if (!next) setOpen(false) }}>
      <Popover.Trigger
        render={<span ref={ref} />}
        nativeButton={false}
        className={cn('underline decoration-dotted decoration-current/40 underline-offset-4', className)}
      >
        {title}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={6} className="z-[60] pointer-events-none">
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal text-white shadow-lg transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-white dark:text-slate-900"
          >
            {hint}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
