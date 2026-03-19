'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Clock, Trophy, Star, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type WordPair = { word: string; translation: string }
type Question = { prompt: string; answer: string; options: string[] }
type Phase = 'ready' | 'playing' | 'finished'
type AnswerState = 'idle' | 'correct' | 'wrong'

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(pool: WordPair[]): Question[] {
  if (pool.length < 4) return []
  return shuffle(pool)
    .slice(0, 40)
    .map((item, i) => {
      const wrong = shuffle(pool.filter((p) => p.word !== item.word)).slice(0, 3)
      if (i % 2 === 0) {
        return {
          prompt: item.word,
          answer: item.translation,
          options: shuffle([item.translation, ...wrong.map((w) => w.translation)]),
        }
      } else {
        return {
          prompt: item.translation,
          answer: item.word,
          options: shuffle([item.word, ...wrong.map((w) => w.word)]),
        }
      }
    })
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SpeedRoundPage() {
  const [pool, setPool] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('ready')
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)

  const phaseRef = useRef<Phase>('ready')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lockRef = useRef(false)

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

  const finishGame = useCallback(
    async (finalScore: number, finalAnswered: number) => {
      if (timerRef.current) clearInterval(timerRef.current)
      phaseRef.current = 'finished'
      setPhase('finished')
      const result = await saveGameResult(finalScore, finalAnswered)
      setRewards(result)
    },
    [],
  )

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setScore((s) => {
            setAnswered((a) => {
              finishGame(s, a)
              return a
            })
            return s
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function startGame() {
    const qs = buildQuestions(pool)
    setQuestions(qs)
    setQIndex(0)
    setScore(0)
    setAnswered(0)
    setCombo(0)
    setTimeLeft(60)
    setAnswerState('idle')
    setSelectedOption(null)
    setRewards(null)
    lockRef.current = false
    phaseRef.current = 'playing'
    setPhase('playing')
  }

  function handleAnswer(option: string) {
    if (lockRef.current || phase !== 'playing') return
    lockRef.current = true
    const q = questions[qIndex]
    const isCorrect = option === q.answer
    setSelectedOption(option)
    setAnswered((prev) => prev + 1)

    if (isCorrect) {
      setScore((prev) => prev + 1)
      setCombo((prev) => prev + 1)
      setAnswerState('correct')
      setTimeout(() => {
        advanceQuestion()
      }, 400)
    } else {
      setCombo(0)
      setAnswerState('wrong')
      setTimeout(() => {
        advanceQuestion()
      }, 800)
    }
  }

  function advanceQuestion() {
    const next = qIndex + 1
    if (next >= questions.length) {
      setScore((s) => {
        setAnswered((a) => {
          finishGame(s, a)
          return a
        })
        return s
      })
    } else {
      setQIndex(next)
      setAnswerState('idle')
      setSelectedOption(null)
      lockRef.current = false
    }
  }

  const currentQ = questions[qIndex]
  const accuracy = answered > 0 ? Math.round((score / answered) * 100) : 0
  const timerPct = (timeLeft / 60) * 100
  const timerRed = timeLeft <= 10

  // ── Ready Screen ─────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#140a00' }}>
        <AppTopbar title="Speed Round" back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            {/* Icon */}
            <div
              className="size-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            >
              <Zap size={44} className="text-white" />
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Speed Round</h1>
              <p className="text-amber-400/70 mt-2 text-base">
                Answer as many as you can before time runs out!
              </p>
            </div>

            {/* Stat boxes */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Time', value: '60s', icon: Clock },
                { label: 'Questions', value: '∞', icon: Zap },
                { label: 'Reward', value: '+3 💎', icon: Trophy },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <Icon size={18} className="text-amber-400" />
                  <span className="text-xl font-bold text-white">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {loading && (
              <p className="text-amber-400/50 text-sm">Loading word pool…</p>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              disabled={loading || pool.length < 4}
              className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            >
              {loading ? 'Loading…' : "Let's Go!"}
            </motion.button>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Result Screen ─────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const finalAccuracy = answered > 0 ? Math.round((score / answered) * 100) : 0
    const emoji = finalAccuracy >= 80 ? '🏆' : finalAccuracy >= 50 ? '⭐' : '💪'
    const headline =
      finalAccuracy >= 80 ? 'Blazing Fast!' : finalAccuracy >= 50 ? 'Nice Work!' : 'Keep Practicing!'

    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#140a00' }}>
        <AppTopbar title="Speed Round" back={{ href: '/play', label: 'Games' }} />
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
                {score} / {answered} correct
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Correct', value: score.toString() },
                { label: 'Accuracy', value: `${finalAccuracy}%` },
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
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
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
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#140a00' }}>
      <AppTopbar title="Speed Round" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full gap-4">
        {/* Timer bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={cn('tabular-nums', timerRed ? 'text-red-400' : 'text-amber-400')}>
              {timeLeft}s
            </span>
            <span className="text-white/40">{score} correct</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', timerRed ? 'bg-red-500' : 'bg-amber-400')}
              style={{ width: `${timerPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Combo badge */}
        <AnimatePresence>
          {combo >= 3 && (
            <motion.div
              key="combo"
              initial={{ scale: 0.5, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="flex justify-center"
            >
              <span
                className="text-sm font-bold px-4 py-1.5 rounded-full text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
              >
                x{Math.min(combo, 5)} Combo!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question card */}
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={qIndex}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-4"
            >
              {/* Prompt */}
              <div
                className={cn(
                  'rounded-3xl p-6 flex items-center justify-center min-h-[140px] transition-colors duration-200',
                  answerState === 'correct'
                    ? 'bg-emerald-500/20 border border-emerald-500/40'
                    : answerState === 'wrong'
                      ? 'bg-red-500/20 border border-red-500/40'
                      : 'bg-white/5 border border-white/10',
                )}
              >
                <p className="text-3xl font-bold text-white text-center leading-tight">
                  {currentQ.prompt}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {currentQ.options.map((option) => {
                  const isSelected = selectedOption === option
                  const isCorrectAnswer = option === currentQ.answer
                  let optionStyle = 'bg-white/5 border-white/10 text-white'

                  if (answerState !== 'idle') {
                    if (isCorrectAnswer) {
                      optionStyle = 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300'
                    } else if (isSelected && !isCorrectAnswer) {
                      optionStyle = 'bg-red-500/25 border-red-500/60 text-red-300'
                    } else {
                      optionStyle = 'bg-white/5 border-white/10 text-white/40'
                    }
                  }

                  return (
                    <motion.button
                      key={option}
                      whileTap={{ scale: answerState === 'idle' ? 0.96 : 1 }}
                      onClick={() => handleAnswer(option)}
                      className={cn(
                        'rounded-2xl border p-4 text-sm font-semibold text-center transition-colors duration-200 min-h-[64px] flex items-center justify-center',
                        optionStyle,
                        answerState === 'idle' && 'hover:bg-white/10 hover:border-amber-400/30 cursor-pointer',
                      )}
                    >
                      {option}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        <div className="mt-auto flex items-center justify-center gap-2">
          <span className="text-xs text-white/30 tabular-nums">
            Question {qIndex + 1} · {answered} answered
          </span>
        </div>
      </main>
    </div>
  )
}
