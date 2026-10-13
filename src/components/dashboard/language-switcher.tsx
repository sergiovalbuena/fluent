'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { LANGUAGES, COURSE_LANGUAGES, getLanguage } from '@/lib/languages'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { setActiveLanguage } from '@/app/(app)/actions'

const OPTIONS = LANGUAGES.map(l => ({ ...l, available: COURSE_LANGUAGES.includes(l.code) }))

export function LanguageSwitcher() {
  const { languageCode } = useActiveLanguage()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(languageCode)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setActive(languageCode) }, [languageCode])

  const current = getLanguage(active)

  // Close on outside click — ref is stable (useRef), setOpen is stable (useState setter)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [setOpen])

  function select(code: string) {
    setOpen(false)
    if (code === active) return
    const previous = active
    setActive(code)
    startTransition(async () => {
      try {
        await setActiveLanguage(code)
        toast.success(`Now learning ${getLanguage(code).name} ${getLanguage(code).flag}`)
        router.push('/learn')
        router.refresh()
      } catch {
        setActive(previous)
        toast.error('Could not switch language')
      }
    })
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        aria-label={`Learning ${current.name}. Change language`}
        className="disabled:opacity-60 flex items-center gap-2 bg-white dark:bg-slate-800 border border-primary/10 hover:border-primary/30 transition-colors px-3 py-1.5 rounded-full cursor-pointer"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <ChevronDown
          size={12}
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-52 rounded-2xl border border-primary/10 bg-white dark:bg-slate-800 shadow-xl shadow-black/10 overflow-hidden z-50"
          >
            <div className="p-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2.5 py-2">
                Choose language
              </p>

              {/* Available */}
              <div className="space-y-0.5">
                {OPTIONS.filter(l => l.available).map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => select(lang.code)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                      lang.code === active
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-xl leading-none">{lang.flag}</span>
                    <span className="flex-1 text-sm font-semibold">{lang.name}</span>
                    {lang.code === active && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-1.5 border-t border-primary/5" />

              {/* Coming soon */}
              <div className="space-y-0.5">
                {OPTIONS.filter(l => !l.available).map(lang => (
                  <div
                    key={lang.code}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-xl opacity-45 cursor-not-allowed"
                  >
                    <span className="text-xl leading-none grayscale">{lang.flag}</span>
                    <span className="flex-1 text-sm font-semibold">{lang.name}</span>
                    <Lock size={11} className="text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
