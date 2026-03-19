'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'ready' | 'playing' | 'finished'
type AnswerState = 'idle' | 'correct' | 'wrong'

interface VocabItem {
  word: string
  translation: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalizeAccents(s: string): string {
  return s
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .replace(/ü/g, 'u')
}

function isCorrectAnswer(typed: string, expected: string): boolean {
  const t = typed.trim().toLowerCase()
  const e = expected.trim().toLowerCase()
  return t === e || normalizeAccents(t) === normalizeAccents(e)
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

const TOTAL_ROUNDS = 10
const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DictationPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [rounds, setRounds] = useState<VocabItem[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [score, setScore] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [reward, setReward] = useState({ xp: 5, gems: 3 })
  const speakingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const speak = useCallback((text: string) => {
    if (!hasSpeech) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 0.85
    utterance.onstart = () => { speakingRef.current = true; setIsSpeaking(true) }
    utterance.onend = () => { speakingRef.current = false; setIsSpeaking(false) }
    utterance.onerror = () => { speakingRef.current = false; setIsSpeaking(false) }
    window.speechSynthesis.speak(utterance)
  }, [])

  // Auto-speak when round changes
  useEffect(() => {
    if (phase !== 'playing') return
    if (rounds.length === 0) return
    const current = rounds[roundIndex]
    if (current) {
      setTimeout(() => speak(current.word), 300)
      setInputValue('')
      setAnswerState('idle')
      inputRef.current?.focus()
    }
  }, [roundIndex, phase, rounds, speak])

  function startGame() {
    const shuffled = shuffle(vocab)
    const selected = shuffled.slice(0, TOTAL_ROUNDS)
    setRounds(selected)
    setRoundIndex(0)
    setScore(0)
    setInputValue('')
    setAnswerState('idle')
    setPhase('playing')
  }

  function submitAnswer() {
    if (answerState !== 'idle') return
    const current = rounds[roundIndex]
    if (!current) return
    const correct = isCorrectAnswer(inputValue, current.word)
    setAnswerState(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 1)
  }

  async function nextRound() {
    if (roundIndex + 1 >= rounds.length) {
      const r = await saveGameResult(score + (answerState === 'correct' ? 0 : 0), rounds.length)
      // recalc with updated score
      const finalScore = answerState === 'correct' ? score : score
      const r2 = await saveGameResult(finalScore, rounds.length)
      setReward(r2)
      setPhase('finished')
    } else {
      setRoundIndex(i => i + 1)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (answerState === 'idle') submitAnswer()
    }
  }

  const current = rounds[roundIndex]
  const accuracy = rounds.length > 0 ? Math.round((score / rounds.length) * 100) : 0

  // ── Ready ──────────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#130008' }}>
        <AppTopbar back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-sm flex flex-col items-center gap-8"
          >
            {/* Icon */}
            <div
              className="size-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
            >
              <Mic size={44} className="text-white" />
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Dictation</h1>
              <p className="text-rose-300/70 mt-2 text-sm leading-relaxed">
                Listen and type what you hear in Spanish
              </p>
            </div>

            {!hasSpeech && (
              <div className="w-full bg-rose-950/50 border border-rose-800/40 rounded-2xl p-4 text-center">
                <p className="text-rose-300 text-sm">
                  Your browser doesn't support speech synthesis. Please use Chrome or Safari.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="w-full grid grid-cols-3 gap-3">
              {[
                { label: 'Rounds', value: '10' },
                { label: 'Skill', value: 'Listen' },
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

            {/* Start */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startGame}
              disabled={vocab.length === 0}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
            >
              {vocab.length === 0 ? 'Loading…' : 'Start Game'}
            </motion.button>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#130008' }}>
        <AppTopbar back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            <div
              className="size-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
            >
              <Mic size={36} className="text-white" />
            </div>

            <div className="text-center">
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Game Over</p>
              <h2 className="text-5xl font-bold text-white tabular-nums">{score}<span className="text-white/30">/{rounds.length}</span></h2>
              <p className="text-rose-400 mt-1 font-semibold">{accuracy}% accuracy</p>
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
                style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
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
    <div className="min-h-screen flex flex-col" style={{ background: '#130008' }}>
      <AppTopbar back={{ href: '/play', label: 'Games' }} />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">

          {/* Round counter */}
          <div className="flex items-center justify-between w-full">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Round</span>
            <span className="text-white font-bold tabular-nums">{roundIndex + 1} / {rounds.length}</span>
            <span className="text-rose-400 text-xs font-bold tabular-nums">Score: {score}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-rose-500"
              animate={{ width: `${((roundIndex + 1) / rounds.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Speaker button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => current && speak(current.word)}
            className={cn(
              'size-28 rounded-full flex items-center justify-center shadow-2xl transition-all',
              isSpeaking ? 'scale-110' : 'scale-100'
            )}
            style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
          >
            <AnimatePresence mode="wait">
              {isSpeaking ? (
                <motion.div
                  key="speaking"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                >
                  <Volume2 size={48} className="text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                >
                  <Mic size={48} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <p className="text-white/30 text-xs">Tap to hear again</p>

          {/* Input + answer area */}
          <AnimatePresence mode="wait">
            {answerState === 'idle' ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col gap-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type what you heard…"
                  className="w-full bg-white/8 border border-white/12 rounded-2xl px-4 py-3.5 text-white placeholder-white/25 text-base focus:outline-none focus:border-rose-500/60 focus:bg-white/10 transition-colors"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={submitAnswer}
                  disabled={inputValue.trim().length === 0}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
                >
                  Submit Answer
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col gap-3"
              >
                {/* Correct/Wrong banner */}
                <div
                  className={cn(
                    'w-full rounded-2xl p-4 flex items-center gap-3',
                    answerState === 'correct'
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'bg-red-500/15 border border-red-500/30'
                  )}
                >
                  {answerState === 'correct' ? (
                    <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle size={22} className="text-red-400 shrink-0" />
                  )}
                  <div>
                    <p className={cn('font-bold text-sm', answerState === 'correct' ? 'text-emerald-300' : 'text-red-300')}>
                      {answerState === 'correct' ? 'Correct!' : 'Not quite'}
                    </p>
                    {answerState === 'wrong' && (
                      <p className="text-white/50 text-xs mt-0.5">You typed: <span className="text-white/70">{inputValue}</span></p>
                    )}
                  </div>
                </div>

                {/* Word reveal */}
                <div className="w-full rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">The word was</p>
                  <p className="text-2xl font-bold text-white">{current?.word}</p>
                  <p className="text-rose-400 text-sm mt-1">{current?.translation}</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={nextRound}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #9f1239, #e11d48)' }}
                >
                  {roundIndex + 1 >= rounds.length ? 'See Results' : 'Next Round'}
                  <ChevronRight size={16} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
