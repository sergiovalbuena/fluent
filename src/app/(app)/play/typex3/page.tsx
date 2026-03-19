'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type WordPair = { word: string; translation: string }
type Phase = 'ready' | 'playing' | 'finished'

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
export default function TypeX3Page() {
  const [pool, setPool] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('ready')

  // Game state
  const [words, setWords] = useState<WordPair[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [repCount, setRepCount] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isWrong, setIsWrong] = useState(false)
  const [perfectWords, setPerfectWords] = useState(0)
  const [mistakeOnCurrentWord, setMistakeOnCurrentWord] = useState(false)
  const [showMastered, setShowMastered] = useState(false)

  // Result
  const [result, setResult] = useState<{ xp: number; gems: number } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

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
        setPool(items)
        setLoading(false)
      })
  }, [])

  function startGame() {
    const source = pool.length > 0 ? pool : [
      { word: 'hola', translation: 'hello' },
      { word: 'casa', translation: 'house' },
      { word: 'perro', translation: 'dog' },
    ]
    const w = shuffle(source).slice(0, 10)
    setWords(w)
    setWordIndex(0)
    setRepCount(0)
    setInputValue('')
    setIsWrong(false)
    setPerfectWords(0)
    setMistakeOnCurrentWord(false)
    setShowMastered(false)
    setResult(null)
    setPhase('playing')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleSubmit() {
    if (showMastered) return
    const target = words[wordIndex]?.word ?? ''
    const trimmed = inputValue.trim()

    if (trimmed === target) {
      const nextRep = repCount + 1
      setInputValue('')
      setIsWrong(false)
      if (nextRep >= 3) {
        // Word complete
        if (!mistakeOnCurrentWord) setPerfectWords(prev => prev + 1)
        setShowMastered(true)
        setTimeout(() => {
          const nextIndex = wordIndex + 1
          if (nextIndex >= words.length) {
            finishGame(!mistakeOnCurrentWord ? perfectWords + 1 : perfectWords)
          } else {
            setWordIndex(nextIndex)
            setRepCount(0)
            setMistakeOnCurrentWord(false)
            setShowMastered(false)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }, 1000)
      } else {
        setRepCount(nextRep)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    } else {
      setIsWrong(true)
      setMistakeOnCurrentWord(true)
      setInputValue('')
      setTimeout(() => {
        setIsWrong(false)
        inputRef.current?.focus()
      }, 500)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function finishGame(finalPerfect: number) {
    setPhase('finished')
    const res = await saveGameResult(finalPerfect, 10)
    setResult(res)
  }

  const currentWord = words[wordIndex]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#001a2e' }}>
      <AppTopbar title="Type × 3" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">

        {/* ── READY ─────────────────────────────────────────────────────── */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8 mt-8"
          >
            <div
              className="size-[120px] rounded-[2.5rem] flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
            >
              <PenLine size={56} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">Type × 3</h1>
              <p className="text-white/50 text-sm max-w-sm">
                Reinforce vocabulary through muscle memory — type each word 3 times
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Words', value: '10' },
                { label: 'Reps each', value: '×3' },
                { label: 'Reward', value: '+3 💎' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              disabled={loading}
              className="px-10 py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
            >
              {loading ? 'Loading…' : 'Start!'}
            </button>
          </motion.div>
        )}

        {/* ── PLAYING ───────────────────────────────────────────────────── */}
        {phase === 'playing' && currentWord && (
          <div className="flex flex-col gap-6 mt-4">
            {/* Progress */}
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-sm">
                Word <span className="text-white font-bold">{wordIndex + 1}</span> / {words.length}
              </span>
              <span className="text-sky-400 font-bold text-sm">
                {perfectWords} perfect
              </span>
            </div>

            {/* Word card */}
            <div className="bg-white/[0.04] border border-sky-400/20 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
              {showMastered ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <p className="text-5xl">✓</p>
                  <p className="text-2xl font-bold text-sky-400">Mastered!</p>
                </motion.div>
              ) : (
                <>
                  <p className="text-5xl font-bold text-sky-400">{currentWord.word}</p>
                  <p className="text-white/50 text-lg">{currentWord.translation}</p>
                </>
              )}
            </div>

            {/* Rep dots */}
            <div className="flex justify-center gap-4">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={cn(
                    'size-4 rounded-full border-2 transition-all duration-300',
                    i < repCount
                      ? 'bg-sky-400 border-sky-400'
                      : 'bg-transparent border-sky-400/30'
                  )}
                />
              ))}
            </div>

            {/* Input */}
            <motion.div
              animate={{ x: isWrong ? [0, -8, 8, -8, 8, 0] : 0 }}
              transition={{ duration: 0.4 }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type the Spanish word…"
                disabled={showMastered}
                className={cn(
                  'w-full bg-white/5 border-2 rounded-2xl px-4 py-3.5 text-white text-lg font-mono outline-none transition-all placeholder:text-white/20',
                  isWrong ? 'border-red-400' : 'border-sky-400/30 focus:border-sky-400'
                )}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </motion.div>

            <button
              onClick={handleSubmit}
              disabled={showMastered || !inputValue.trim()}
              className="w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
            >
              Submit
            </button>
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
              style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
            >
              <PenLine size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">Practice Complete!</h2>
            </div>

            <div className="bg-white/5 border border-sky-400/20 rounded-3xl p-8 text-center w-full max-w-xs">
              <p className="text-sky-400 text-6xl font-bold tabular-nums">{perfectWords}</p>
              <p className="text-white/40 text-sm mt-2">/ 10 words with no mistakes</p>
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
                style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
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
