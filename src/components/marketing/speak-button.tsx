'use client'

import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { speak } from '@/lib/languages'
import { cn } from '@/lib/utils'

/** Text that plays its audio when tapped (cached clips work signed out) */
export function SpeakButton({ text, lang, label, className, children }: {
  text: string
  lang: string
  label?: string
  className?: string
  children?: React.ReactNode
}) {
  const [playing, setPlaying] = useState(false)
  return (
    <button
      type="button"
      aria-label={label ?? text}
      onClick={() => speak(text, lang, { onStart: () => setPlaying(true), onEnd: () => setPlaying(false) })}
      className={cn('group inline-flex items-center gap-2 text-left transition-colors hover:text-primary', className)}
    >
      <Volume2 size={14} className={cn('shrink-0 text-slate-400 transition-colors group-hover:text-primary', playing && 'animate-pulse text-primary')} />
      {children ?? text}
    </button>
  )
}
