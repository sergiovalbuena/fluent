'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Flame, Gem, Zap, Volume2, Bookmark } from 'lucide-react'

// ── Typing Challenge Demo ────────────────────────────────────────────────────

const DEMO_ENTRIES = [
  { word: 'La abuela',  translation: 'Grandmother', emoji: '👵', mastered: false },
  { word: 'El abuelo',  translation: 'Grandfather',  emoji: '👴', mastered: false },
  { word: 'La familia', translation: 'Family',        emoji: '👨‍👩‍👧', mastered: false },
]

function TypingDemo() {
  const [idx,      setIdx]      = useState(0)
  const [typed,    setTyped]    = useState('')
  const [done,     setDone]     = useState(false)
  const [mastered, setMastered] = useState<boolean[]>([false, false, false])

  const target = DEMO_ENTRIES[idx].word

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setMastered(prev => { const next = [...prev]; next[idx] = true; return next })
        setTimeout(() => {
          setIdx(i => (i + 1) % DEMO_ENTRIES.length)
          setTyped('')
          setDone(false)
        }, 700)
      }, 900)
      return () => clearTimeout(t)
    }

    if (typed.length >= target.length) { setDone(true); return }

    const delay = 90 + Math.random() * 70
    const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), delay)
    return () => clearTimeout(t)
  }, [typed, done, target, idx])

  return (
    <div className="space-y-3">
      {/* Round indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(r => (
          <div key={r} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${r === 1 ? 'bg-primary' : 'bg-white/10'}`} />
        ))}
        <span className="text-[10px] font-bold text-slate-500 ml-1 whitespace-nowrap">Round 1 / 3</span>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-2 justify-center py-1">
        <span className="text-xl">{DEMO_ENTRIES[idx].emoji}</span>
        <span className="text-slate-400 text-sm">{DEMO_ENTRIES[idx].translation}</span>
      </div>

      {/* Characters */}
      <div className="flex items-center justify-center gap-0.5 min-h-10 font-bold text-2xl tracking-wide select-none">
        {target.split('').map((ch, i) => {
          const isTyped  = i < typed.length
          const isCursor = i === typed.length
          const isSpace  = ch === ' '
          return (
            <span key={i} className={`relative transition-colors duration-100 ${isSpace ? 'w-3' : ''} ${
              isTyped  ? (done ? 'text-lime-400' : 'text-lime-400') :
              isCursor ? 'text-white/25' :
              'text-white/15'
            }`}>
              {isSpace ? '\u00A0' : ch}
              {isCursor && !done && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="absolute -right-px top-[10%] bottom-[5%] w-[2px] bg-primary rounded-full"
                />
              )}
            </span>
          )
        })}
      </div>

      {/* Feedback */}
      <div className="h-8 flex items-center justify-center">
        {done && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 bg-lime-500/10 border border-lime-500/20 px-4 py-1.5 rounded-full"
          >
            <Star size={12} className="fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-bold text-lime-400">Correct! +1 mastered</span>
          </motion.div>
        )}
      </div>

      {/* Word chips */}
      <div className="flex gap-2 flex-wrap">
        {DEMO_ENTRIES.map((entry, i) => (
          <div key={entry.word} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            mastered[i]
              ? 'bg-lime-500/10 border-lime-500/20 text-lime-400'
              : i === idx
                ? 'bg-primary/15 border-primary/25 text-primary'
                : 'bg-white/5 border-white/5 text-slate-500'
          }`}>
            {mastered[i] && <Star size={9} className="fill-yellow-500 text-yellow-500" />}
            {entry.word}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-12 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 items-center">

          {/* ── Left ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs font-bold"
            >
              <Zap size={11} className="fill-primary" />
              New — Challenge Mode · Master words 3× faster
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.07] tracking-tight">
              Speak a new{' '}
              <span className="relative inline-block">
                <span className="text-primary">language</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.9, duration: 0.5, ease: 'easeOut' }}
                  className="absolute bottom-0.5 left-0 right-0 h-[3px] bg-primary/25 origin-left block rounded-full"
                />
              </span>
              <br />
              in 10 minutes a day.
            </h1>

            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-[500px]">
              Structured modules, a MonkeyType-style challenge that locks in vocabulary, and{' '}
              <span className="text-primary font-semibold">MarIA</span> — your AI conversation partner. Real fluency, not engagement hacks.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link href="/login">
                <button className="w-full sm:w-auto bg-primary text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 text-base">
                  Start for free →
                </button>
              </Link>
              <a href="#how-it-works">
                <button className="w-full sm:w-auto bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold px-8 py-4 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-primary/30 transition-all text-base">
                  See how it works
                </button>
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-sm leading-none">★</span>)}
              </div>
              <p className="text-xs text-slate-400 font-medium">No credit card · 6 languages · Free to start</p>
            </div>
          </motion.div>

          {/* ── Right: App mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            {/* Phone card */}
            <div className="relative bg-[#1a0d07] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
              {/* App header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">F</div>
                  <span className="font-bold text-white text-sm">Family &amp; Home</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-orange-400">
                    <Flame size={12} className="fill-orange-400" />7
                  </span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Star size={12} className="fill-yellow-400" />420
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Gem size={12} />85
                  </span>
                </div>
              </div>

              {/* Word list */}
              <div className="px-4 pt-4 pb-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Vocabulary · 8 words</p>
                <div className="space-y-1">
                  {[
                    { word: 'La abuela', tr: 'Grandmother', mastered: true  },
                    { word: 'El abuelo', tr: 'Grandfather',  mastered: true  },
                    { word: 'La madre',  tr: 'Mother',       mastered: false, active: true },
                    { word: 'El padre',  tr: 'Father',       mastered: false },
                  ].map((w, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                      w.active
                        ? 'bg-primary/15 border border-primary/20'
                        : 'bg-white/[0.03] border border-transparent'
                    }`}>
                      <span className={`text-xs font-bold ${w.active ? 'text-primary' : 'text-white'}`}>{w.word}</span>
                      {!w.active && <span className="text-[10px] text-slate-600">{w.tr}</span>}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {w.mastered && <Star size={10} className="fill-yellow-500 text-yellow-500" />}
                        <Volume2 size={10} className="text-slate-700" />
                        <Bookmark size={10} className="text-slate-700" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenge modal preview */}
              <div className="mx-4 mb-4 bg-[#0f0805] rounded-2xl border border-white/[0.06] p-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-3">Challenge Mode</p>
                <TypingDemo />
              </div>
            </div>

            {/* Floating badge — words mastered */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -right-8 top-10 bg-white dark:bg-[#2c1a12] rounded-2xl shadow-xl border border-primary/10 px-4 py-3 text-center"
            >
              <p className="text-[10px] text-slate-400 mb-0.5">Words mastered</p>
              <p className="text-2xl font-bold text-primary tabular-nums">245</p>
            </motion.div>

            {/* Floating badge — streak */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut', delay: 0.4 }}
              className="absolute -left-7 bottom-14 bg-white dark:bg-[#2c1a12] rounded-2xl shadow-xl border border-primary/10 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-orange-500 fill-orange-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold leading-tight">12 day streak</p>
                  <p className="text-[10px] text-slate-400">Keep going!</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
