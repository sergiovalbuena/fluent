'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bookmark, Flame, Gem, Star, Volume2, Zap } from 'lucide-react'
import { getCopy } from '@/lib/marketing/copy'
import type { SiteLocale } from '@/lib/marketing/i18n'

type DemoWord = { word: string; tr: string; emoji: string }

function TypingDemo({ words, round, correct }: { words: DemoWord[]; round: string; correct: string }) {
  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false)
  const [mastered, setMastered] = useState<boolean[]>(() => words.map(() => false))

  const target = words[idx].word

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setMastered(prev => prev.map((m, i) => (i === idx ? true : m)))
        setTimeout(() => {
          setIdx(i => (i + 1) % words.length)
          setTyped('')
          setDone(false)
        }, 700)
      }, 900)
      return () => clearTimeout(t)
    }

    // Typing animation state machine driven by timers
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typed.length >= target.length) { setDone(true); return }

    const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 90 + Math.random() * 70)
    return () => clearTimeout(t)
  }, [typed, done, target, idx, words.length])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(r => (
          <div key={r} className={`h-1 flex-1 rounded-full ${r === 1 ? 'bg-primary' : 'bg-white/10'}`} />
        ))}
        <span className="ml-1 whitespace-nowrap text-[10px] font-bold text-slate-500">{round}</span>
      </div>

      <div className="flex items-center justify-center gap-2 py-1">
        <span className="text-xl">{words[idx].emoji}</span>
        <span className="text-sm text-slate-400">{words[idx].tr}</span>
      </div>

      <div className="flex min-h-10 select-none items-center justify-center gap-0.5 text-2xl font-bold tracking-wide">
        {target.split('').map((ch, i) => {
          const isCursor = i === typed.length
          return (
            <span key={i} className={`relative ${ch === ' ' ? 'w-3' : ''} ${i < typed.length ? 'text-lime-400' : isCursor ? 'text-white/25' : 'text-white/15'}`}>
              {ch === ' ' ? ' ' : ch}
              {isCursor && !done && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="absolute -right-px bottom-[5%] top-[10%] w-[2px] rounded-full bg-primary"
                />
              )}
            </span>
          )
        })}
      </div>

      <div className="flex h-8 items-center justify-center">
        {done && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 rounded-full border border-lime-500/20 bg-lime-500/10 px-4 py-1.5"
          >
            <Star size={12} className="fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-bold text-lime-400">{correct}</span>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {words.map((entry, i) => (
          <div key={entry.word} className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
            mastered[i]
              ? 'border-lime-500/20 bg-lime-500/10 text-lime-400'
              : i === idx
                ? 'border-primary/25 bg-primary/15 text-primary'
                : 'border-white/5 bg-white/5 text-slate-500'
          }`}>
            {mastered[i] && <Star size={9} className="fill-yellow-500 text-yellow-500" />}
            {entry.word}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeHero({ locale }: { locale: SiteLocale }) {
  const c = getCopy(locale)
  const h = c.home
  const m = h.mock

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/4 translate-y-1/3 rounded-full bg-primary/4 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 md:px-8 md:pb-20 md:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_480px] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary">
              <Zap size={11} className="fill-primary" />
              {h.badge}
            </div>

            <h1 className="text-4xl font-bold leading-[1.07] tracking-tight md:text-5xl lg:text-[3.4rem]">
              {h.titleA}{' '}
              <span className="text-primary">{h.titleB}</span>
              <br />
              {h.titleC}
            </h1>

            <p className="max-w-[520px] text-lg leading-relaxed text-slate-500 dark:text-slate-400">{h.sub}</p>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link href="/signup"
                className="rounded-xl bg-primary px-8 py-4 text-center text-base font-bold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95">
                {c.startFree} →
              </Link>
              <a href="#courses"
                className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-center text-base font-bold text-slate-700 transition-all hover:border-primary/30 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200">
                {h.seeCourses}
              </a>
            </div>

            <p className="pt-1 text-xs font-medium text-slate-400">{h.trust}</p>
          </motion.div>

          {/* App mockup */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
            aria-hidden
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#131722] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">F</div>
                  <span className="text-sm font-bold text-white">{m.lesson}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-orange-400"><Flame size={12} className="fill-orange-400" />12</span>
                  <span className="flex items-center gap-1 text-yellow-400"><Star size={12} className="fill-yellow-400" />420</span>
                  <span className="flex items-center gap-1 text-amber-400"><Gem size={12} />85</span>
                </div>
              </div>

              <div className="px-4 pb-3 pt-4">
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{m.vocab}</p>
                <div className="space-y-1">
                  {m.words.map((w, i) => (
                    <div key={w.word} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i === 1 ? 'border border-primary/20 bg-primary/15' : 'border border-transparent bg-white/[0.03]'}`}>
                      <span className={`text-xs font-bold ${i === 1 ? 'text-primary' : 'text-white'}`}>{w.word}</span>
                      <span className="text-[10px] text-slate-500">{w.tr}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        {i === 0 && <Star size={10} className="fill-yellow-500 text-yellow-500" />}
                        <Volume2 size={10} className="text-slate-600" />
                        <Bookmark size={10} className="text-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-4 mb-4 rounded-2xl border border-white/[0.06] bg-[#080a10] p-4">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">{m.challenge}</p>
                <TypingDemo words={m.words} round={m.round} correct={m.correct} />
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -right-8 top-10 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-center shadow-xl dark:bg-[#202638]"
            >
              <p className="mb-0.5 text-[10px] text-slate-400">{m.mastered}</p>
              <p className="text-2xl font-bold tabular-nums text-primary">245</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut', delay: 0.4 }}
              className="absolute -left-7 bottom-14 rounded-2xl border border-primary/10 bg-white px-4 py-3 shadow-xl dark:bg-[#202638]"
            >
              <div className="flex items-center gap-2">
                <Flame size={20} className="shrink-0 fill-orange-500 text-orange-500" />
                <div>
                  <p className="text-xs font-bold leading-tight">{m.streak}</p>
                  <p className="text-[10px] text-slate-400">{m.keepGoing}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
