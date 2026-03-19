'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'ready' | 'playing' | 'finished'
type CardType = 'word' | 'translation'

interface VocabItem {
  word: string
  translation: string
}

interface Card {
  id: string
  pairId: string
  content: string
  type: CardType
  isFlipped: boolean
  isMatched: boolean
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

function buildCards(pairs: VocabItem[]): Card[] {
  const cards: Card[] = []
  pairs.forEach((pair, idx) => {
    const pairId = `pair-${idx}`
    cards.push({ id: `${pairId}-w`, pairId, content: pair.word, type: 'word', isFlipped: false, isMatched: false })
    cards.push({ id: `${pairId}-t`, pairId, content: pair.translation, type: 'translation', isFlipped: false, isMatched: false })
  })
  return shuffle(cards)
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

const PAIRS = 8

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MatchingPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [flippedIds, setFlippedIds] = useState<string[]>([])
  const [matchedCount, setMatchedCount] = useState(0)
  const [mismatches, setMismatches] = useState(0)
  const [lockBoard, setLockBoard] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [reward, setReward] = useState({ xp: 5, gems: 3 })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finalTimeRef = useRef(0)

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

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  function startGame() {
    const pairs = shuffle(vocab).slice(0, PAIRS)
    setCards(buildCards(pairs))
    setFlippedIds([])
    setMatchedCount(0)
    setMismatches(0)
    setLockBoard(false)
    setElapsed(0)
    stopTimer()
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    setPhase('playing')
  }

  function handleCardClick(cardId: string) {
    if (lockBoard) return
    const card = cards.find(c => c.id === cardId)
    if (!card || card.isFlipped || card.isMatched) return
    if (flippedIds.length === 1 && flippedIds[0] === cardId) return

    const newFlipped = [...flippedIds, cardId]

    // Flip the card
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c))
    setFlippedIds(newFlipped)

    if (newFlipped.length === 2) {
      setLockBoard(true)
      const [firstId, secondId] = newFlipped
      const first = cards.find(c => c.id === firstId)
      const second = cards.find(c => c.id === secondId)

      if (first && second && first.pairId === second.pairId) {
        // Match!
        const newMatchedCount = matchedCount + 1
        setCards(prev => prev.map(c =>
          c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
        ))
        setMatchedCount(newMatchedCount)
        setFlippedIds([])
        setLockBoard(false)

        if (newMatchedCount === PAIRS) {
          stopTimer()
          finalTimeRef.current = elapsed
          saveGameResult(PAIRS, PAIRS).then(r => setReward(r))
          setPhase('finished')
        }
      } else {
        // No match
        setMismatches(m => m + 1)
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          ))
          setFlippedIds([])
          setLockBoard(false)
        }, 1000)
      }
    }
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#001210' }}>
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
              style={{ background: 'linear-gradient(135deg, #0e7490, #0d9488)' }}
            >
              <LayoutGrid size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Matching</h1>
              <p className="text-cyan-300/70 mt-2 text-sm leading-relaxed">
                Flip cards and match each Spanish word with its English translation
              </p>
            </div>

            <div className="w-full grid grid-cols-3 gap-3">
              {[
                { label: 'Pairs', value: '8' },
                { label: 'Skill', value: 'Vocab' },
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
              style={{ background: 'linear-gradient(135deg, #0e7490, #0d9488)' }}
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
      <div className="min-h-screen flex flex-col" style={{ background: '#001210' }}>
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
              style={{ background: 'linear-gradient(135deg, #0e7490, #0d9488)' }}
            >
              <LayoutGrid size={36} className="text-white" />
            </div>

            <div className="text-center">
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Completed!</p>
              <h2 className="text-5xl font-bold text-white tabular-nums">{PAIRS}<span className="text-white/30">/{PAIRS}</span></h2>
              <p className="text-cyan-400 mt-1 font-semibold">All pairs matched</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-white">{formatTime(elapsed)}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Time Taken</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-white">{mismatches}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Mismatches</p>
              </div>
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
                style={{ background: 'linear-gradient(135deg, #0e7490, #0d9488)' }}
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
    <div className="min-h-screen flex flex-col" style={{ background: '#001210' }}>
      <AppTopbar back={{ href: '/play', label: 'Games' }} />
      <main className="flex-1 flex flex-col items-center px-3 py-5">
        <div className="w-full max-w-lg flex flex-col gap-4">

          {/* Stats bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/60 text-xs font-bold tabular-nums">
              <span className="text-cyan-400">{formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-white/40">Pairs: <span className="text-cyan-400">{matchedCount}/{PAIRS}</span></span>
              <span className="text-white/40">Misses: <span className="text-red-400">{mismatches}</span></span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-2">
            {cards.map(card => {
              const isActive = flippedIds.includes(card.id)
              return (
                <motion.button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.isMatched || card.isFlipped || lockBoard}
                  whileTap={!card.isMatched && !card.isFlipped ? { scale: 0.94 } : {}}
                  className={cn(
                    'relative min-h-[80px] rounded-2xl flex items-center justify-center p-2 transition-all duration-300 cursor-pointer border text-center',
                    card.isMatched
                      ? 'bg-emerald-500/20 border-emerald-500/40 cursor-default'
                      : card.isFlipped
                        ? card.type === 'word'
                          ? 'bg-cyan-500/20 border-cyan-400/40'
                          : 'bg-teal-500/20 border-teal-400/40'
                        : 'bg-white/[0.08] border-white/[0.12] hover:bg-white/[0.15]'
                  )}
                >
                  {card.isFlipped || card.isMatched ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'text-xs font-bold leading-tight',
                        card.isMatched ? 'text-emerald-300' : card.type === 'word' ? 'text-cyan-200' : 'text-teal-200'
                      )}
                    >
                      {card.content}
                    </motion.span>
                  ) : (
                    <span className="text-xl font-bold text-white/20">?</span>
                  )}

                  {/* Matched checkmark */}
                  {card.isMatched && (
                    <div className="absolute top-1 right-1">
                      <div className="size-2 rounded-full bg-emerald-400" />
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Bottom hint */}
          <p className="text-center text-white/25 text-xs">Flip two cards — match the word with its translation</p>
        </div>
      </main>
    </div>
  )
}
