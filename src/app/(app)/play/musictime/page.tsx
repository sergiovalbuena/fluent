'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, Volume2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'ready' | 'playing' | 'finished'
type AnswerState = 'idle' | 'correct' | 'wrong'

interface Lyric {
  song: string
  artist: string
  fullLine: string
  displayLine: string
  blank: string
  hint: string
  options: [string, string, string, string]
}

// ── Lyrics data ────────────────────────────────────────────────────────────────
const LYRICS: Lyric[] = [
  { song: 'Despacito', artist: 'Luis Fonsi', fullLine: 'Quiero respirar tu cuello despacito', displayLine: 'Quiero respirar tu ___ despacito', blank: 'cuello', hint: '(neck)', options: ['cuello', 'pelo', 'corazón', 'aliento'] },
  { song: 'La Bamba', artist: 'Ritchie Valens', fullLine: 'Para bailar la bamba se necesita una poca de gracia', displayLine: 'Para bailar la bamba se necesita una ___ de gracia', blank: 'poca', hint: '(a little)', options: ['poca', 'mucha', 'toda', 'nada'] },
  { song: 'Bamboleo', artist: 'Gipsy Kings', fullLine: 'Bamboleo, bambolea, porque mi vida yo la tengo que vivir', displayLine: 'Bamboleo, bambolea, porque mi ___ yo la tengo que vivir', blank: 'vida', hint: '(life)', options: ['vida', 'alma', 'casa', 'canción'] },
  { song: 'Livin la Vida Loca', artist: 'Ricky Martin', fullLine: 'Tiene los ojos como dos luceros', displayLine: 'Tiene los ___ como dos luceros', blank: 'ojos', hint: '(eyes)', options: ['ojos', 'labios', 'manos', 'pies'] },
  { song: 'Cielito Lindo', artist: 'Traditional', fullLine: 'Ay ay ay ay, canta y no llores', displayLine: 'Ay ay ay ay, canta y no ___', blank: 'llores', hint: '(cry)', options: ['llores', 'bailes', 'corras', 'rías'] },
  { song: 'Bésame Mucho', artist: 'Consuelo Velázquez', fullLine: 'Bésame, bésame mucho, como si fuera esta noche la última vez', displayLine: 'Bésame, bésame mucho, como si fuera esta noche la ___ vez', blank: 'última', hint: '(last)', options: ['última', 'primera', 'única', 'próxima'] },
  { song: 'Quizás Quizás Quizás', artist: 'Osvaldo Farrés', fullLine: 'Siempre que te pregunto que cuándo, cómo y dónde', displayLine: 'Siempre que te ___ que cuándo, cómo y dónde', blank: 'pregunto', hint: '(ask)', options: ['pregunto', 'digo', 'llamo', 'busco'] },
  { song: 'Historia de un Amor', artist: 'Traditional', fullLine: 'Ya no estás más a mi lado corazón', displayLine: 'Ya no estás más a mi ___ corazón', blank: 'lado', hint: '(side)', options: ['lado', 'amor', 'mundo', 'tiempo'] },
  { song: 'El Rey', artist: 'José Alfredo Jiménez', fullLine: 'Con dinero o sin dinero hago siempre lo que quiero', displayLine: 'Con ___ o sin dinero hago siempre lo que quiero', blank: 'dinero', hint: '(money)', options: ['dinero', 'amor', 'tiempo', 'poder'] },
  { song: 'Sabor a Mí', artist: 'Álvaro Carrillo', fullLine: 'Tanto tiempo disfrutamos de este amor', displayLine: 'Tanto ___ disfrutamos de este amor', blank: 'tiempo', hint: '(time)', options: ['tiempo', 'amor', 'ritmo', 'cielo'] },
  { song: 'Cuando me Enamoro', artist: 'Enrique Iglesias', fullLine: 'Cuando me enamoro me olvido del mundo entero', displayLine: 'Cuando me enamoro me ___ del mundo entero', blank: 'olvido', hint: '(forget)', options: ['olvido', 'separo', 'alejo', 'escondo'] },
  { song: 'Amor Eterno', artist: 'Rocío Dúrcal', fullLine: 'Amor eterno e inolvidable, tarde o temprano estaré contigo', displayLine: 'Amor eterno e inolvidable, tarde o ___ estaré contigo', blank: 'temprano', hint: '(soon/early)', options: ['temprano', 'siempre', 'nunca', 'lejos'] },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
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

const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window

function renderDisplayLine(displayLine: string) {
  const parts = displayLine.split('___')
  if (parts.length !== 2) return <span className="text-white">{displayLine}</span>
  return (
    <span className="text-white">
      {parts[0]}
      <span className="inline-block min-w-[80px] border-b-2 border-fuchsia-400 text-fuchsia-400 px-1 text-center font-bold">
        {'     '}
      </span>
      {parts[1]}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MusicTimePage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [rounds, setRounds] = useState<Lyric[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [reward, setReward] = useState({ xp: 5, gems: 3 })

  const speak = useCallback((text: string) => {
    if (!hasSpeech) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 0.82
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    if (rounds.length === 0) return
    const current = rounds[qIndex]
    if (current) {
      setTimeout(() => speak(current.fullLine), 300)
      setAnswerState('idle')
      setSelectedOption(null)
    }
  }, [qIndex, phase, rounds, speak])

  function startGame() {
    const selected = shuffle(LYRICS).slice(0, 10)
    setRounds(selected)
    setQIndex(0)
    setScore(0)
    setAnswerState('idle')
    setSelectedOption(null)
    setPhase('playing')
  }

  function pickOption(option: string) {
    if (answerState !== 'idle') return
    const current = rounds[qIndex]
    if (!current) return
    setSelectedOption(option)
    const correct = option === current.blank
    setAnswerState(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 1)
  }

  async function nextQuestion() {
    if (qIndex + 1 >= rounds.length) {
      const finalScore = answerState === 'correct' ? score : score
      const r = await saveGameResult(finalScore, rounds.length)
      setReward(r)
      setPhase('finished')
    } else {
      setQIndex(i => i + 1)
    }
  }

  const current = rounds[qIndex]
  const accuracy = rounds.length > 0 ? Math.round((score / rounds.length) * 100) : 0

  // ── Ready ──────────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0d0017' }}>
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
              style={{ background: 'linear-gradient(135deg, #7e22ce, #c026d3)' }}
            >
              <Music size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Music Time</h1>
              <p className="text-fuchsia-300/70 mt-2 text-sm leading-relaxed">
                Fill in the missing word from famous Spanish songs
              </p>
            </div>

            <div className="w-full grid grid-cols-3 gap-3">
              {[
                { label: 'Songs', value: '10' },
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

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startGame}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7e22ce, #c026d3)' }}
            >
              Start Game
            </motion.button>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Finished ───────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0d0017' }}>
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
              style={{ background: 'linear-gradient(135deg, #7e22ce, #c026d3)' }}
            >
              <Music size={36} className="text-white" />
            </div>

            <div className="text-center">
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Game Over</p>
              <h2 className="text-5xl font-bold text-white tabular-nums">{score}<span className="text-white/30">/{rounds.length}</span></h2>
              <p className="text-fuchsia-400 mt-1 font-semibold">{accuracy}% accuracy</p>
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
                style={{ background: 'linear-gradient(135deg, #7e22ce, #c026d3)' }}
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
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0017' }}>
      <AppTopbar back={{ href: '/play', label: 'Games' }} />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md flex flex-col gap-5">

          {/* Round counter + score */}
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Song {qIndex + 1} / {rounds.length}</span>
            <span className="text-fuchsia-400 text-xs font-bold tabular-nums">Score: {score}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-fuchsia-500"
              animate={{ width: `${((qIndex + 1) / rounds.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Song info + Hear button */}
          <div className="rounded-2xl bg-white/5 border border-white/8 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-bold text-sm">{current?.song}</p>
              <p className="text-white/40 text-xs">{current?.artist}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => current && speak(current.fullLine)}
              className={cn(
                'size-10 rounded-xl flex items-center justify-center transition-colors shrink-0',
                isSpeaking ? 'bg-fuchsia-500/40' : 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30'
              )}
            >
              <Volume2 size={18} className="text-fuchsia-300" />
            </motion.button>
          </div>

          {/* Lyric display */}
          <div className="rounded-2xl bg-white/5 border border-white/8 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-3">Fill in the blank</p>
            <p className="text-lg font-semibold leading-relaxed">
              {current && renderDisplayLine(current.displayLine)}
            </p>
            {current && (
              <p className="text-xs text-fuchsia-400/60 mt-2 italic">{current.hint}</p>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2.5">
            {current?.options.map(option => {
              const isSelected = selectedOption === option
              const isCorrectOption = option === current.blank
              let btnClass = 'bg-white/6 border border-white/12 text-white hover:bg-white/12'
              if (answerState !== 'idle') {
                if (isCorrectOption) btnClass = 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                else if (isSelected && !isCorrectOption) btnClass = 'bg-red-500/20 border border-red-500/50 text-red-300'
                else btnClass = 'bg-white/4 border border-white/8 text-white/30'
              }
              return (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pickOption(option)}
                  disabled={answerState !== 'idle'}
                  className={cn('rounded-xl py-3 px-4 font-bold text-sm transition-colors flex items-center justify-between', btnClass)}
                >
                  <span>{option}</span>
                  {answerState !== 'idle' && isCorrectOption && <CheckCircle2 size={14} className="text-emerald-400" />}
                  {answerState !== 'idle' && isSelected && !isCorrectOption && <XCircle size={14} className="text-red-400" />}
                </motion.button>
              )
            })}
          </div>

          {/* Next button */}
          <AnimatePresence>
            {answerState !== 'idle' && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={nextQuestion}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7e22ce, #c026d3)' }}
              >
                {qIndex + 1 >= rounds.length ? 'See Results' : 'Next Song'}
                <ChevronRight size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
