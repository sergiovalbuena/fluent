'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Bot, RotateCcw } from 'lucide-react'
import { getCopy } from '@/lib/marketing/copy'
import type { SiteLocale } from '@/lib/marketing/i18n'
import { cn } from '@/lib/utils'

/** Scripted MarIA conversation: plays message by message once it scrolls into view (no API calls) */
export function MariaChat({ locale, script = 0, className }: { locale: SiteLocale; script?: number; className?: string }) {
  const m = getCopy(locale).maria
  const messages = m.scripts[script]
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [shown, setShown] = useState(0)
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (!inView || shown >= messages.length) return
    const next = messages[shown]
    const t = setTimeout(() => setShown(n => n + 1), shown === 0 ? 300 : next.from === 'maria' ? 1400 : 1100)
    return () => clearTimeout(t)
  }, [inView, shown, messages, run])

  const typing = inView && shown < messages.length && messages[shown].from === 'maria'

  return (
    <div ref={ref} className={cn('flex flex-col rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-950 to-indigo-950 p-5 shadow-2xl', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/20">
            <Bot size={16} className="text-violet-300" />
          </div>
          <p className="text-sm font-bold text-white">MarIA</p>
        </div>
        <button
          type="button"
          onClick={() => { setShown(0); setRun(r => r + 1) }}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-violet-300/70 transition-colors hover:bg-white/5 hover:text-violet-200"
        >
          <RotateCcw size={11} />
          {m.replay}
        </button>
      </div>

      <div className="flex min-h-[300px] flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.slice(0, shown).map((msg, i) => (
            <motion.div
              key={`${run}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', msg.from === 'user' ? 'justify-end' : 'items-end gap-2')}
            >
              {msg.from === 'maria' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                  <Bot size={13} className="text-violet-300" />
                </div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed text-white',
                msg.from === 'user'
                  ? 'rounded-tr-sm border border-violet-500/20 bg-violet-500/20'
                  : 'rounded-bl-sm border border-white/10 bg-white/[0.06]',
              )}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <div className="flex items-end gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
              <Bot size={13} className="text-violet-300" />
            </div>
            <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.06] px-4 py-3">
              {[0, 1, 2].map(d => (
                <motion.span key={d} className="size-1.5 rounded-full bg-violet-300"
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
