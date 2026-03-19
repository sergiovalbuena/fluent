'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Trophy, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type WordPair = { word: string; translation: string }
type Tile = { id: number; char: string }
type Phase = 'ready' | 'playing' | 'finished'
type RoundState = 'answering' | 'correct' | 'wrong'

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getMainWord(word: string): string {
  return word.replace(/^(La|El|Los|Las|Un|Una)\s+/i, '').toLowerCase().trim()
}

function scrambleChars(word: string): Tile[] {
  const chars = word.split('')
  let shuffled = [...chars]
  for (let tries = 0; tries < 20 && shuffled.join('') === word; tries++) {
    shuffled = shuffle(shuffled)
  }
  return shuffled.map((char, i) => ({ id: i, char }))
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
export default function WordScramblePage() {
  const [pool, setPool] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('ready')

  // Round state
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [roundState, setRoundState] = useState<RoundState>('answering')
  const [mainWord, setMainWord] = useState('')
  const [clue, setClue] = useState('')
  const [bankTiles, setBankTiles] = useState<Tile[]>([])
  const [answerTiles, setAnswerTiles] = useState<Tile[]>([])
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)
  const [usedIndices, setUsedIndices] = useState<number[]>([])

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
            if (i.word && i.translation && getMainWord(i.word).length >= 3) {
              items.push({ word: i.word, translation: i.translation })
            }
          })
        })
        setPool(items)
        setLoading(false)
      })
  }, [])

  const loadRound = useCallback(
    (roundIndex: number, currentPool: WordPair[], used: number[]) => {
      const available = currentPool
        .map((_, i) => i)
        .filter((i) => !used.includes(i))
      if (available.length === 0) return

      const pickedIdx = available[Math.floor(Math.random() * available.length)]
      const pair = currentPool[pickedIdx]
      const mw = getMainWord(pair.word)

      setMainWord(mw)
      setClue(pair.translation)
      setBankTiles(scrambleChars(mw))
      setAnswerTiles([])
      setRoundState('answering')
      setUsedIndices((prev) => [...prev, pickedIdx])
      void roundIndex // suppress unused warning
    },
    [],
  )

  function startGame() {
    setRound(0)
    setScore(0)
    setRewards(null)
    setUsedIndices([])
    const newUsed: number[] = []
    const available = pool.map((_, i) => i)
    const pickedIdx = available[Math.floor(Math.random() * available.length)]
    const pair = pool[pickedIdx]
    const mw = getMainWord(pair.word)
    setMainWord(mw)
    setClue(pair.translation)
    setBankTiles(scrambleChars(mw))
    setAnswerTiles([])
    setRoundState('answering')
    setUsedIndices([pickedIdx])
    void newUsed
    setPhase('playing')
  }

  function moveTileToAnswer(tile: Tile) {
    if (roundState !== 'answering') return
    setBankTiles((prev) => prev.filter((t) => t.id !== tile.id))
    setAnswerTiles((prev) => [...prev, tile])
  }

  function moveTileToBank(tile: Tile) {
    if (roundState !== 'answering') return
    setAnswerTiles((prev) => prev.filter((t) => t.id !== tile.id))
    setBankTiles((prev) => [...prev, tile])
  }

  function resetTiles() {
    setBankTiles(scrambleChars(mainWord))
    setAnswerTiles([])
  }

  function checkAnswer() {
    if (roundState !== 'answering') return
    if (answerTiles.length !== mainWord.length) return

    const attempt = answerTiles.map((t) => t.char).join('')
    const isCorrect = attempt === mainWord

    if (isCorrect) {
      setScore((prev) => prev + 1)
      setRoundState('correct')
      setTimeout(() => advanceRound(), 1000)
    } else {
      setRoundState('wrong')
      setTimeout(() => {
        setBankTiles(scrambleChars(mainWord))
        setAnswerTiles([])
        setTimeout(() => advanceRound(), 200)
      }, 1500)
    }
  }

  async function advanceRound() {
    const nextRound = round + 1
    if (nextRound >= TOTAL_ROUNDS) {
      const result = await saveGameResult(score + (roundState === 'correct' ? 1 : 0), TOTAL_ROUNDS)
      setRewards(result)
      setPhase('finished')
      return
    }
    setRound(nextRound)
    loadRound(nextRound, pool, usedIndices)
  }

  // ── Ready Screen ─────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#050b1a' }}>
        <AppTopbar title="Word Scramble" back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            <div
              className="size-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #4338ca)' }}
            >
              <Shuffle size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Word Scramble</h1>
              <p className="text-blue-400/70 mt-2 text-base">
                Unscramble the letters to find the Spanish word!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Rounds', value: '10', icon: Shuffle },
                { label: 'Letters', value: 'A-Z', icon: Shuffle },
                { label: 'Reward', value: '+3 💎', icon: Trophy },
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

            {loading && <p className="text-blue-400/50 text-sm">Loading words…</p>}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              disabled={loading || pool.length === 0}
              className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #4338ca)' }}
            >
              {loading ? 'Loading…' : 'Start Game'}
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
      accuracy >= 80 ? 'Word Wizard!' : accuracy >= 50 ? 'Good Effort!' : 'Keep Scrambling!'

    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#050b1a' }}>
        <AppTopbar title="Word Scramble" back={{ href: '/play', label: 'Games' }} />
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
                style={{ background: 'linear-gradient(135deg, #3b82f6, #4338ca)' }}
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
  const progressPct = ((round) / TOTAL_ROUNDS) * 100

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#050b1a' }}>
      <AppTopbar title="Word Scramble" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full gap-5">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-blue-400">Round {round + 1} / {TOTAL_ROUNDS}</span>
            <span className="text-white/40">{score} correct</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue-500"
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
            className="flex flex-col gap-5 flex-1"
          >
            {/* Clue */}
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400/60 mb-2">
                Translate this word
              </p>
              <p className="text-3xl font-bold text-white">{clue}</p>
            </div>

            {/* Answer area */}
            <div
              className={cn(
                'rounded-2xl border-2 p-4 min-h-[68px] flex items-center justify-center flex-wrap gap-2 transition-colors duration-300',
                roundState === 'correct'
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : roundState === 'wrong'
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-blue-500/30 bg-blue-500/5',
              )}
            >
              {answerTiles.length === 0 ? (
                <div className="flex gap-1.5">
                  {mainWord.split('').map((_, i) => (
                    <div
                      key={i}
                      className="h-10 w-8 rounded-lg border border-dashed border-white/20"
                    />
                  ))}
                </div>
              ) : (
                answerTiles.map((tile) => (
                  <motion.button
                    key={tile.id}
                    layout
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => moveTileToBank(tile)}
                    className={cn(
                      'h-12 min-w-[44px] px-3 rounded-xl font-bold text-lg text-white transition-colors',
                      roundState === 'correct'
                        ? 'bg-emerald-500 cursor-default'
                        : roundState === 'wrong'
                          ? 'bg-red-500 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-500 cursor-pointer',
                    )}
                  >
                    {tile.char}
                  </motion.button>
                ))
              )}
            </div>

            {/* Result label */}
            <AnimatePresence>
              {roundState === 'correct' && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-emerald-400 font-bold text-sm"
                >
                  Correct! Well done 🎉
                </motion.p>
              )}
              {roundState === 'wrong' && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-red-400 font-bold text-sm"
                >
                  The answer was: <span className="text-white">{mainWord}</span>
                </motion.p>
              )}
            </AnimatePresence>

            {/* Bank */}
            <div className="flex flex-wrap gap-2 justify-center py-2">
              {bankTiles.map((tile) => (
                <motion.button
                  key={tile.id}
                  layout
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => moveTileToAnswer(tile)}
                  disabled={roundState !== 'answering'}
                  className={cn(
                    'h-12 min-w-[44px] px-3 rounded-xl font-bold text-lg bg-white/10 border border-white/15 text-white transition-colors',
                    roundState === 'answering'
                      ? 'hover:bg-blue-500/30 hover:border-blue-400/40 cursor-pointer'
                      : 'opacity-40 cursor-default',
                  )}
                >
                  {tile.char}
                </motion.button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={resetTiles}
                disabled={roundState !== 'answering'}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <RotateCcw size={15} />
                Reset
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={checkAnswer}
                disabled={answerTiles.length !== mainWord.length || roundState !== 'answering'}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #4338ca)' }}
              >
                Check Answer
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
