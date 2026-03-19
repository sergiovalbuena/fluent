'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid3x3, X, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'ready' | 'playing' | 'finished'
type Mark = 'X' | 'O' | null
type GameOutcome = 'win' | 'lose' | 'draw' | null

interface VocabItem {
  word: string
  translation: string
}

interface Question {
  prompt: string
  answer: string
  options: string[]
}

// ── Constants ──────────────────────────────────────────────────────────────────
const WIN_PATTERNS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

// ── Helpers ────────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function checkWinner(board: Mark[]): Mark {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

function buildQuestions(vocab: VocabItem[]): Question[] {
  return vocab.map(item => {
    const distractors = shuffle(vocab.filter(v => v.translation !== item.translation)).slice(0, 3).map(v => v.translation)
    return {
      prompt: item.word,
      answer: item.translation,
      options: shuffle([item.translation, ...distractors]),
    }
  })
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

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TicTacToePage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null))
  const [pendingCell, setPendingCell] = useState<number | null>(null)
  const [showQuestion, setShowQuestion] = useState(false)
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [outcome, setOutcome] = useState<GameOutcome>(null)
  const [scores, setScores] = useState({ wins: 0, losses: 0, draws: 0 })
  const [reward, setReward] = useState({ xp: 5, gems: 3 })
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)

  // Load vocab
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('lessons')
      .select('content')
      .eq('type', 'vocabulary')
      .eq('is_published', true)
      .then(({ data }) => {
        if (!data) return
        const items: VocabItem[] = []
        for (const lesson of data) {
          const c = lesson.content as { items?: Array<{ word: string; translation: string }> }
          if (c?.items) {
            for (const item of c.items) {
              if (item.word && item.translation) items.push({ word: item.word, translation: item.translation })
            }
          }
        }
        setVocab(items)
      })
  }, [])

  const currentQuestion = questions[qIndex % Math.max(questions.length, 1)]

  function startGame() {
    const qs = buildQuestions(shuffle(vocab).slice(0, Math.min(vocab.length, 20)))
    setQuestions(qs)
    setQIndex(0)
    setBoard(Array(9).fill(null))
    setPendingCell(null)
    setShowQuestion(false)
    setAnswerFeedback(null)
    setOutcome(null)
    setTotalCorrect(0)
    setTotalAnswered(0)
    setPhase('playing')
  }

  function handleCellClick(index: number) {
    if (board[index] !== null) return
    if (showQuestion) return
    if (outcome) return
    setPendingCell(index)
    setShowQuestion(true)
    setAnswerFeedback(null)
  }

  const placeComputerMove = useCallback((currentBoard: Mark[]): Mark[] => {
    const empty = currentBoard.map((v, i) => v === null ? i : -1).filter(i => i !== -1)
    if (empty.length === 0) return currentBoard

    // Try to win
    for (const cell of empty) {
      const test = [...currentBoard]
      test[cell] = 'O'
      if (checkWinner(test) === 'O') {
        return test
      }
    }
    // Block player
    for (const cell of empty) {
      const test = [...currentBoard]
      test[cell] = 'X'
      if (checkWinner(test) === 'X') {
        const block = [...currentBoard]
        block[cell] = 'O'
        return block
      }
    }
    // Random
    const pick = empty[Math.floor(Math.random() * empty.length)]
    const next = [...currentBoard]
    next[pick] = 'O'
    return next
  }, [])

  function resolveGame(newBoard: Mark[]) {
    const winner = checkWinner(newBoard)
    const isFull = newBoard.every(c => c !== null)
    if (winner === 'X') {
      setOutcome('win')
      setScores(s => ({ ...s, wins: s.wins + 1 }))
      saveGameResult(totalCorrect + 1, totalAnswered + 1).then(r => setReward(r))
      setPhase('finished')
    } else if (winner === 'O') {
      setOutcome('lose')
      setScores(s => ({ ...s, losses: s.losses + 1 }))
      saveGameResult(totalCorrect, totalAnswered + 1).then(r => setReward(r))
      setPhase('finished')
    } else if (isFull) {
      setOutcome('draw')
      setScores(s => ({ ...s, draws: s.draws + 1 }))
      saveGameResult(totalCorrect, totalAnswered + 1).then(r => setReward(r))
      setPhase('finished')
    }
  }

  function handleAnswer(option: string) {
    if (answerFeedback !== null) return
    if (pendingCell === null) return
    const isCorrect = option === currentQuestion?.answer
    setAnswerFeedback(isCorrect ? 'correct' : 'wrong')
    setTotalAnswered(t => t + 1)
    if (isCorrect) setTotalCorrect(t => t + 1)
    setQIndex(i => i + 1)

    if (isCorrect) {
      // Player places X
      setTimeout(() => {
        const newBoard = [...board]
        newBoard[pendingCell] = 'X'
        setBoard(newBoard)
        setShowQuestion(false)
        setPendingCell(null)
        setAnswerFeedback(null)

        const winnerAfterX = checkWinner(newBoard)
        const fullAfterX = newBoard.every(c => c !== null)
        if (winnerAfterX || fullAfterX) {
          resolveGame(newBoard)
          return
        }

        // Computer plays
        setTimeout(() => {
          const afterComputer = placeComputerMove(newBoard)
          setBoard(afterComputer)
          resolveGame(afterComputer)
        }, 600)
      }, 700)
    } else {
      // Computer places O
      setTimeout(() => {
        const afterComputer = placeComputerMove(board)
        setBoard(afterComputer)
        setShowQuestion(false)
        setPendingCell(null)
        setAnswerFeedback(null)
        resolveGame(afterComputer)
      }, 900)
    }
  }

  function closeQuestion() {
    setShowQuestion(false)
    setPendingCell(null)
    setAnswerFeedback(null)
  }

  const outcomeConfig = {
    win:  { emoji: '🎉', label: 'You Win!',     color: 'text-emerald-400' },
    lose: { emoji: '😅', label: 'You Lose',     color: 'text-red-400'     },
    draw: { emoji: '🤝', label: "It's a Draw",  color: 'text-yellow-400'  },
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#060014' }}>
        <AppTopbar back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-sm flex flex-col items-center gap-8"
          >
            <div
              className="size-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #4338ca, #7c3aed)' }}
            >
              <Grid3x3 size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Tic Tac Toe</h1>
              <p className="text-indigo-300/70 mt-2 text-sm leading-relaxed">
                Answer vocabulary questions to earn your turn and beat the AI
              </p>
            </div>

            <div className="w-full grid grid-cols-3 gap-3">
              {[
                { label: 'Grid', value: '3×3' },
                { label: 'vs', value: 'CPU' },
                { label: 'Reward', value: '+3 💎' },
              ].map(s => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-white/8 bg-white/5 py-3 px-2"
                >
                  <span className="text-base font-bold text-white">{s.value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{s.label}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startGame}
              disabled={vocab.length === 0}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #4338ca, #7c3aed)' }}
            >
              {vocab.length === 0 ? 'Loading…' : 'Start Game'}
            </motion.button>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (phase === 'finished' && outcome) {
    const cfg = outcomeConfig[outcome]
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#060014' }}>
        <AppTopbar back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            <div className="text-center">
              <p className="text-6xl mb-3">{cfg.emoji}</p>
              <h2 className={cn('text-4xl font-bold', cfg.color)}>{cfg.label}</h2>
            </div>

            {/* Session scores */}
            <div className="w-full grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{scores.wins}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Wins</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{scores.losses}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Losses</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{scores.draws}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Draws</p>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-white">+{reward.xp}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">XP Earned</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-white">+{reward.gems} 💎</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Gems Earned</p>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startGame}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #4338ca, #7c3aed)' }}
              >
                Play Again
              </motion.button>
              <Link href="/play" className="w-full">
                <button className="w-full py-3.5 rounded-2xl text-white/60 font-bold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  Back to Games
                </button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#060014' }}>
      <AppTopbar back={{ href: '/play', label: 'Games' }} />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">

          {/* Score */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-emerald-400">W: {scores.wins}</span>
            <span className="text-white/30">|</span>
            <span className="text-red-400">L: {scores.losses}</span>
            <span className="text-white/30">|</span>
            <span className="text-yellow-400">D: {scores.draws}</span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="size-5 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                <X size={10} className="text-indigo-400" strokeWidth={3} />
              </div>
              <span className="text-white/50">You</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-5 rounded bg-slate-500/20 border border-slate-500/40 flex items-center justify-center">
                <span className="text-slate-400 text-[10px] font-bold leading-none">O</span>
              </div>
              <span className="text-white/50">CPU</span>
            </div>
          </div>

          {/* Board */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[320px]">
            {board.map((mark, idx) => (
              <motion.button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={mark !== null || showQuestion || outcome !== null}
                whileTap={mark === null && !showQuestion ? { scale: 0.93 } : {}}
                className={cn(
                  'aspect-square rounded-2xl border flex items-center justify-center transition-colors',
                  mark === null && !showQuestion && !outcome
                    ? 'bg-white/[0.05] border-white/[0.12] hover:bg-indigo-500/10 hover:border-indigo-500/30 cursor-pointer'
                    : 'bg-white/[0.03] border-white/[0.08] cursor-default'
                )}
              >
                {mark === 'X' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <X size={42} className="text-indigo-400" strokeWidth={3} />
                  </motion.div>
                )}
                {mark === 'O' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="text-slate-400 text-4xl font-bold leading-none select-none"
                  >
                    O
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          <p className="text-white/25 text-xs text-center">
            {showQuestion ? 'Answer the question to place your X' : 'Tap an empty cell to challenge'}
          </p>
        </div>

        {/* Question panel */}
        <AnimatePresence>
          {showQuestion && currentQuestion && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-20"
                onClick={answerFeedback === null ? closeQuestion : undefined}
              />

              {/* Panel */}
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-8 pt-4"
              >
                <div
                  className="w-full max-w-md mx-auto rounded-3xl border border-white/10 p-5 flex flex-col gap-4"
                  style={{ background: '#1a0035' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Vocabulary Question</p>
                    {answerFeedback === null && (
                      <button
                        onClick={closeQuestion}
                        className="text-white/30 hover:text-white/60 text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                    <p className="text-xs text-white/40 mb-1">What does this mean?</p>
                    <p className="text-2xl font-bold text-white">{currentQuestion.prompt}</p>
                  </div>

                  {/* Feedback banner */}
                  <AnimatePresence>
                    {answerFeedback && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          'rounded-xl p-3 flex items-center gap-2',
                          answerFeedback === 'correct'
                            ? 'bg-emerald-500/15 border border-emerald-500/30'
                            : 'bg-red-500/15 border border-red-500/30'
                        )}
                      >
                        {answerFeedback === 'correct'
                          ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          : <XCircle size={16} className="text-red-400 shrink-0" />
                        }
                        <p className={cn('text-sm font-bold', answerFeedback === 'correct' ? 'text-emerald-300' : 'text-red-300')}>
                          {answerFeedback === 'correct' ? 'Correct! Place your X.' : 'Wrong! CPU places O.'}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-2">
                    {currentQuestion.options.map(option => {
                      const isCorrectOpt = option === currentQuestion.answer
                      let btnClass = 'bg-white/6 border-white/12 text-white hover:bg-white/12'
                      if (answerFeedback !== null) {
                        if (isCorrectOpt) btnClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        else btnClass = 'bg-white/3 border-white/6 text-white/30'
                      }
                      return (
                        <motion.button
                          key={option}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAnswer(option)}
                          disabled={answerFeedback !== null}
                          className={cn('rounded-xl py-3 px-3 font-bold text-sm border transition-colors', btnClass)}
                        >
                          {option}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
