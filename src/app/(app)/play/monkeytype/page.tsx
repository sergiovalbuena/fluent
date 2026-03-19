'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type CharState = 'correct' | 'wrong' | 'pending'
type WordStatus = 'done-correct' | 'done-wrong' | 'current' | 'upcoming'
type Phase = 'ready' | 'playing' | 'finished'
type WordPair = { word: string; translation: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function saveGameResult(correct: number, total: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { xp: 5, gems: 3 }
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const xp = pct >= 80 ? 15 : pct >= 60 ? 10 : 5
  const gems = 3
  const { data: profile } = await supabase
    .from('user_profiles').select('total_xp, total_gems').eq('user_id', user.id).maybeSingle()
  await supabase
    .from('user_profiles')
    .update({ total_xp: (profile?.total_xp ?? 0) + xp, total_gems: (profile?.total_gems ?? 0) + gems })
    .eq('user_id', user.id)
  return { xp, gems }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MonkeyTypePage() {
  const [pool, setPool] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('ready')
  const [timerChoice, setTimerChoice] = useState<30 | 60>(60)

  // Game state
  const [words, setWords] = useState<string[]>([])
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [correctWords, setCorrectWords] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Result
  const [result, setResult] = useState<{ xp: number; gems: number } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const currentWordRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load vocab
  useEffect(() => {
    const supabase = createClient()
    supabase.from('lessons').select('content').eq('type', 'vocabulary').eq('is_published', true)
      .then(({ data }) => {
        const items: WordPair[] = []
        data?.forEach(lesson => {
          const c = lesson.content as { items?: Array<{ word: string; translation: string }> }
          c.items?.forEach(i => { if (i.word && i.translation) items.push({ word: i.word, translation: i.translation }) })
        })
        setPool(items.map(i => i.word))
        setLoading(false)
      })
  }, [])

  // Scroll current word into view
  useEffect(() => {
    currentWordRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [currentIndex])

  const buildWordList = useCallback((wordPool: string[]): string[] => {
    if (wordPool.length === 0) return []
    const shuffled = shuffle(wordPool)
    // Build 80 words by cycling through pool
    const result: string[] = []
    for (let i = 0; i < 80; i++) {
      result.push(shuffled[i % shuffled.length])
    }
    return result
  }, [])

  function startGame() {
    const wordList = buildWordList(pool.length > 0 ? pool : ['hola', 'casa', 'perro', 'gato', 'agua'])
    setWords(wordList)
    setWordStatuses(wordList.map(() => 'upcoming' as WordStatus))
    setCurrentIndex(0)
    setInputValue('')
    setTimeLeft(timerChoice)
    setElapsed(0)
    setCorrectWords(0)
    setTotalWords(0)
    setResult(null)
    setPhase('playing')

    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    // Update current word status
    setWordStatuses(prev => {
      const next = [...prev]
      next[currentIndex] = 'current'
      return next
    })

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          finishGame()
          return 0
        }
        return prev - 1
      })
      setElapsed(prev => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  async function finishGame() {
    setPhase('finished')
    const res = await saveGameResult(correctWords, totalWords)
    setResult(res)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      const typed = inputValue.trim()
      const target = words[currentIndex]
      const isCorrect = typed === target

      setTotalWords(prev => prev + 1)
      if (isCorrect) setCorrectWords(prev => prev + 1)

      // Update status of current word
      setWordStatuses(prev => {
        const next = [...prev]
        next[currentIndex] = isCorrect ? 'done-correct' : 'done-wrong'
        // Set next word as current
        const nextIdx = currentIndex + 1
        if (nextIdx < next.length) next[nextIdx] = 'current'
        return next
      })

      setCurrentIndex(prev => {
        const next = prev + 1
        if (next >= words.length) {
          // Reload words (infinite)
          const newWords = buildWordList(pool)
          setWords(newWords)
          setWordStatuses(newWords.map((_, i) => (i === 0 ? 'current' : 'upcoming') as WordStatus))
          return 0
        }
        return next
      })
      setInputValue('')
    }
  }

  // WPM
  const wpm = elapsed > 0 ? Math.round(correctWords / (elapsed / 60)) : 0
  const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 100

  // Char states for current word
  function getCharStates(target: string, typed: string): CharState[] {
    return target.split('').map((ch, i) => {
      if (i >= typed.length) return 'pending'
      return typed[i] === ch ? 'correct' : 'wrong'
    })
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#050e00' }}>
      <AppTopbar title="MonkeyType" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-6 max-w-3xl mx-auto w-full">

        {/* ── READY ─────────────────────────────────────────────────────── */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8 mt-8"
          >
            {/* Icon */}
            <div
              className="size-[120px] rounded-[2.5rem] flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #4d7c0f, #65a30d)' }}
            >
              <Keyboard size={56} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">MonkeyType</h1>
              <p className="text-white/50 text-sm max-w-sm">
                Type Spanish words as fast as you can — test your speed and accuracy
              </p>
            </div>

            {/* Timer choice */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Timer</p>
              <div className="flex gap-3">
                {([30, 60] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimerChoice(t)}
                    className={cn(
                      'px-6 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                      timerChoice === t
                        ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                    )}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            {/* Reward */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-center">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Reward</p>
              <p className="text-2xl font-bold text-white">+3 💎</p>
            </div>

            <button
              onClick={startGame}
              disabled={loading}
              className="px-10 py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #4d7c0f, #65a30d)' }}
            >
              {loading ? 'Loading words…' : 'Start Typing!'}
            </button>
          </motion.div>
        )}

        {/* ── PLAYING ───────────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div className="flex flex-col gap-6 flex-1">
            {/* Header stats */}
            <div className="flex items-center gap-4">
              {/* Timer bar */}
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-lime-400 rounded-full"
                    animate={{ width: `${(timeLeft / timerChoice) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-lime-400 font-bold text-lg mt-1 tabular-nums">{timeLeft}s</p>
              </div>
              {/* WPM */}
              <div className="text-right">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">WPM</p>
                <p className="text-lime-400 font-bold text-2xl tabular-nums">{wpm}</p>
              </div>
            </div>

            {/* Word track */}
            <div
              ref={trackRef}
              className="flex-1 bg-white/[0.03] rounded-2xl p-6 overflow-hidden relative"
              style={{ minHeight: '180px', maxHeight: '240px' }}
            >
              <div className="flex flex-wrap gap-x-3 gap-y-2 overflow-hidden" style={{ maxHeight: '200px' }}>
                {words.slice(0, Math.min(currentIndex + 30, words.length)).map((word, i) => {
                  const status = wordStatuses[i]
                  if (status === 'done-correct') {
                    return (
                      <span key={i} className="text-xl text-white/20 font-mono">{word}</span>
                    )
                  }
                  if (status === 'done-wrong') {
                    return (
                      <span key={i} className="text-xl text-red-400/40 font-mono line-through">{word}</span>
                    )
                  }
                  if (status === 'current') {
                    const charStates = getCharStates(word, inputValue)
                    return (
                      <span
                        key={i}
                        ref={currentWordRef}
                        className="text-xl font-mono bg-lime-400/10 rounded px-1 inline-flex"
                      >
                        {word.split('').map((ch, ci) => (
                          <span
                            key={ci}
                            className={cn(
                              charStates[ci] === 'correct' && 'text-lime-400',
                              charStates[ci] === 'wrong' && 'text-red-400',
                              charStates[ci] === 'pending' && 'text-white/70',
                            )}
                          >
                            {ch}
                          </span>
                        ))}
                      </span>
                    )
                  }
                  return (
                    <span key={i} className="text-xl text-white/50 font-mono">{word}</span>
                  )
                })}
              </div>
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type here, press Space to submit…"
              className="w-full bg-transparent border-b-2 border-lime-400/30 focus:border-lime-400 outline-none text-white text-xl font-mono py-3 px-1 placeholder:text-white/20 transition-colors"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            {/* Bottom hint */}
            <p className="text-white/20 text-xs text-center">Press Space to submit each word</p>
          </div>
        )}

        {/* ── FINISHED ──────────────────────────────────────────────────── */}
        {phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 mt-8"
          >
            <div
              className="size-[100px] rounded-[2rem] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4d7c0f, #65a30d)' }}
            >
              <Keyboard size={44} className="text-white" />
            </div>

            <h2 className="text-3xl font-bold text-white">Time's up!</h2>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-lime-400/20">
                <p className="text-lime-400 text-4xl font-bold tabular-nums">{wpm}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">WPM</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white text-4xl font-bold tabular-nums">{accuracy}%</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Accuracy</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white text-3xl font-bold tabular-nums">{correctWords}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Correct</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white text-3xl font-bold tabular-nums">{totalWords}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Total</p>
              </div>
            </div>

            {result && (
              <div className="flex gap-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-3 text-center">
                  <p className="text-yellow-400 font-bold text-lg">+{result.xp} XP</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-center">
                  <p className="text-amber-400 font-bold text-lg">+{result.gems} 💎</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #4d7c0f, #65a30d)' }}
              >
                Play Again
              </button>
              <a
                href="/play"
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-all"
              >
                Back to Games
              </a>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  )
}
