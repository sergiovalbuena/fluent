'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Volume2, Trophy, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type WordPair = { word: string; translation: string }
type Phase = 'ready' | 'playing' | 'finished'
type RoundState = 'listening' | 'answered'

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'es-ES'
  utt.rate = 0.85
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

async function saveGameResult(correct: number, total: number) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { xp: 5, gems: 3 }
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const xp = pct >= 80 ? 15 : pct >= 60 ? 10 : 5
  const gems = 3
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('total_xp, total_gems')
    .eq('user_id', user.id)
    .maybeSingle()
  await supabase
    .from('user_profiles')
    .update({
      total_xp: (profile?.total_xp ?? 0) + xp,
      total_gems: (profile?.total_gems ?? 0) + gems,
    })
    .eq('user_id', user.id)
  return { xp, gems }
}

const TOTAL_ROUNDS = 10

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ListeningPage() {
  const [pool, setPool] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(true)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [phase, setPhase] = useState<Phase>('ready')

  // Round state
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [roundState, setRoundState] = useState<RoundState>('listening')
  const [currentWord, setCurrentWord] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)
  const [usedIndices, setUsedIndices] = useState<number[]>([])

  const lockRef = useRef(false)

  // Check speech support
  useEffect(() => {
    setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  // Fetch vocabulary
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('lessons')
      .select('content')
      .eq('type', 'vocabulary')
      .eq('is_published', true)
      .then(({ data }) => {
        const items: WordPair[] = []
        data?.forEach((lesson) => {
          const c = lesson.content as { items?: Array<{ word: string; translation: string }> }
          c.items?.forEach((i) => {
            if (i.word && i.translation) items.push({ word: i.word, translation: i.translation })
          })
        })
        setPool(items)
        setLoading(false)
      })
  }, [])

  const loadRound = useCallback(
    (currentPool: WordPair[], used: number[]) => {
      const available = currentPool.map((_, i) => i).filter((i) => !used.includes(i))
      if (available.length === 0) return null

      const pickedIdx = available[Math.floor(Math.random() * available.length)]
      const pair = currentPool[pickedIdx]

      // Build 4 options
      const wrongPool = currentPool.filter((_, i) => i !== pickedIdx)
      const wrongs = shuffle(wrongPool).slice(0, 3).map((p) => p.translation)
      const shuffledOptions = shuffle([pair.translation, ...wrongs])

      return {
        word: pair.word,
        correct: pair.translation,
        options: shuffledOptions,
        usedIdx: pickedIdx,
      }
    },
    [],
  )

  function autoSpeak(word: string) {
    setIsPlaying(true)
    speak(word, () => setIsPlaying(false))
  }

  function startGame() {
    const newUsed: number[] = []
    const roundData = loadRound(pool, newUsed)
    if (!roundData) return

    setRound(0)
    setScore(0)
    setRewards(null)
    setSelectedAnswer(null)
    setRoundState('listening')
    lockRef.current = false
    setCurrentWord(roundData.word)
    setCorrectAnswer(roundData.correct)
    setOptions(roundData.options)
    setUsedIndices([roundData.usedIdx])
    setPhase('playing')

    setTimeout(() => autoSpeak(roundData.word), 400)
  }

  // Auto-speak when round changes during playing
  const prevRoundRef = useRef(-1)
  useEffect(() => {
    if (phase !== 'playing') return
    if (round === prevRoundRef.current) return
    prevRoundRef.current = round
    if (currentWord) {
      setTimeout(() => autoSpeak(currentWord), 300)
    }
  }, [round, currentWord, phase])

  function handleAnswer(option: string) {
    if (lockRef.current || roundState !== 'listening') return
    lockRef.current = true
    setSelectedAnswer(option)
    setRoundState('answered')

    if (option === correctAnswer) {
      setScore((prev) => prev + 1)
    }

    setTimeout(() => advanceRound(), 1000)
  }

  async function advanceRound() {
    const nextRound = round + 1
    if (nextRound >= TOTAL_ROUNDS) {
      // score state is stale in async context; selectedAnswer tracks last pick
      const result = await saveGameResult(
        score + (selectedAnswer === correctAnswer ? 1 : 0),
        TOTAL_ROUNDS,
      )
      setRewards(result)
      setPhase('finished')
      return
    }

    const roundData = loadRound(pool, usedIndices)
    if (!roundData) {
      const result = await saveGameResult(score, TOTAL_ROUNDS)
      setRewards(result)
      setPhase('finished')
      return
    }

    setRound(nextRound)
    setCurrentWord(roundData.word)
    setCorrectAnswer(roundData.correct)
    setOptions(roundData.options)
    setSelectedAnswer(null)
    setRoundState('listening')
    setUsedIndices((prev) => [...prev, roundData.usedIdx])
    lockRef.current = false
  }

  // ── Ready Screen ─────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#0d0817' }}>
        <AppTopbar title="Listening" back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            <div
              className="size-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a21caf)' }}
            >
              <Headphones size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Listening</h1>
              <p className="text-violet-400/70 mt-2 text-base">
                Hear the Spanish word and pick its English meaning!
              </p>
            </div>

            {!speechSupported && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm font-medium">
                <AlertTriangle size={16} />
                Audio not supported in this browser
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Rounds', value: '10' },
                { label: 'Language', value: 'ES' },
                { label: 'Reward', value: '+3 💎' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <span className="text-xl font-bold text-white">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {loading && <p className="text-violet-400/50 text-sm">Loading words…</p>}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              disabled={loading || pool.length < 4}
              className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a21caf)' }}
            >
              {loading ? 'Loading…' : 'Start Listening'}
            </motion.button>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Result Screen ─────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const accuracy = Math.round((score / TOTAL_ROUNDS) * 100)
    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 50 ? '⭐' : '💪'
    const headline =
      accuracy >= 80 ? 'Sharp Ears!' : accuracy >= 50 ? 'Getting Better!' : 'Keep Listening!'

    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#0d0817' }}>
        <AppTopbar title="Listening" back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="flex flex-col items-center gap-6 text-center w-full max-w-md"
          >
            <span className="text-7xl">{emoji}</span>
            <div>
              <h2 className="text-3xl font-bold text-white">{headline}</h2>
              <p className="text-white/50 mt-1">
                {score} / {TOTAL_ROUNDS} correct
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Correct', value: score.toString() },
                { label: 'Accuracy', value: `${accuracy}%` },
                { label: 'XP Earned', value: rewards ? `+${rewards.xp}` : '…' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <span className="text-2xl font-bold text-white">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {rewards && (
              <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 px-5 py-2.5 rounded-xl font-bold">
                +{rewards.gems} 💎 Gems earned
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startGame}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a21caf)' }}
              >
                Play Again
              </motion.button>
              <Link href="/play" className="w-full">
                <button className="w-full py-3.5 rounded-2xl bg-white/8 border border-white/12 text-white/70 font-bold text-base hover:bg-white/12 transition-colors">
                  Back to Games
                </button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Playing Screen ─────────────────────────────────────────────────────────────
  const progressPct = (round / TOTAL_ROUNDS) * 100

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0d0817' }}>
      <AppTopbar title="Listening" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full gap-5">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-violet-400">Round {round + 1} / {TOTAL_ROUNDS}</span>
            <span className="text-white/40">{score} correct</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #7c3aed, #a21caf)' }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-6 flex-1"
          >
            {/* Speaker button */}
            <div className="flex flex-col items-center gap-3 py-4">
              <motion.button
                onClick={() => {
                  setIsPlaying(true)
                  speak(currentWord, () => setIsPlaying(false))
                }}
                animate={isPlaying ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={
                  isPlaying
                    ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
                className="size-32 rounded-full flex items-center justify-center shadow-2xl cursor-pointer relative"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a21caf)' }}
              >
                {/* Glow ring when playing */}
                {isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a21caf)', opacity: 0.4 }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <Volume2 size={52} className="text-white relative z-10" />
              </motion.button>
              <p className="text-sm text-white/40 font-medium">
                {isPlaying ? 'Playing…' : 'Tap to listen again'}
              </p>
            </div>

            {/* Options — 2×2 grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {options.map((option) => {
                const isSelected = selectedAnswer === option
                const isCorrectOpt = option === correctAnswer

                let optStyle = 'bg-white/5 border-white/10 text-white hover:bg-violet-500/20 hover:border-violet-400/40'
                if (roundState === 'answered') {
                  if (isCorrectOpt) {
                    optStyle = 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300'
                  } else if (isSelected) {
                    optStyle = 'bg-red-500/25 border-red-500/60 text-red-300'
                  } else {
                    optStyle = 'bg-white/5 border-white/10 text-white/35'
                  }
                }

                return (
                  <motion.button
                    key={option}
                    whileTap={{ scale: roundState === 'listening' ? 0.96 : 1 }}
                    onClick={() => handleAnswer(option)}
                    disabled={roundState === 'answered'}
                    className={cn(
                      'rounded-2xl border p-5 text-sm font-semibold text-center transition-all duration-200 min-h-[76px] flex items-center justify-center',
                      optStyle,
                    )}
                  >
                    {option}
                  </motion.button>
                )
              })}
            </div>

            {/* Speech unsupported warning */}
            {!speechSupported && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-2.5 rounded-xl text-xs font-medium w-full">
                <AlertTriangle size={14} />
                Audio not supported in this browser
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Trophy icon subtle */}
        <div className="flex items-center justify-center mt-auto">
          <Trophy size={16} className="text-white/10" />
        </div>
      </main>
    </div>
  )
}
