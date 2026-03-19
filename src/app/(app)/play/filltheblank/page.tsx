'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type PhrasePair = { phrase: string; translation: string }
type WordPair = { word: string; translation: string }
type Phase = 'ready' | 'playing' | 'finished'
type RoundState = 'answering' | 'correct' | 'wrong'
type BlankResult = { display: string; blank: string }

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

const SKIP_WORDS = new Set([
  'para', 'por', 'que', 'con', 'una', 'está', 'hay', 'los', 'las', 'del',
  'muy', 'por', 'más', 'pero', 'este', 'esta', 'ese', 'esa', 'sus', 'son',
])

function blankWord(phrase: string): BlankResult {
  const words = phrase.split(' ')
  const candidates = words
    .map((w, i) => ({
      raw: w,
      clean: w.replace(/[,?.¿¡!]/g, '').toLowerCase(),
      i,
    }))
    .filter(({ clean, i }) => i > 0 && clean.length >= 4 && !SKIP_WORDS.has(clean))

  const chosen =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : {
          raw: words[words.length - 1],
          clean: words[words.length - 1].replace(/[,?.¿¡!]/g, '').toLowerCase(),
          i: words.length - 1,
        }

  const display = words.map((w, i) => (i === chosen.i ? '_____' : w)).join(' ')
  return { display, blank: chosen.clean }
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
export default function FillTheBlankPage() {
  const [phrases, setPhrases] = useState<PhrasePair[]>([])
  const [vocabPool, setVocabPool] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('ready')

  // Round state
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [roundState, setRoundState] = useState<RoundState>('answering')
  const [displayPhrase, setDisplayPhrase] = useState('')
  const [fullPhrase, setFullPhrase] = useState('')
  const [translation, setTranslation] = useState('')
  const [blank, setBlank] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)
  const [usedIndices, setUsedIndices] = useState<number[]>([])

  // Fetch phrases + vocab
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('lessons')
        .select('content')
        .eq('type', 'phrases')
        .eq('is_published', true),
      supabase
        .from('lessons')
        .select('content')
        .eq('type', 'vocabulary')
        .eq('is_published', true),
    ]).then(([phrasesRes, vocabRes]) => {
      // Collect phrases
      const phraseItems: PhrasePair[] = []
      phrasesRes.data?.forEach((lesson) => {
        const c = lesson.content as {
          items?: Array<{ phrase: string; translation: string }>
          phrases?: Array<{ phrase: string; translation: string }>
        }
        const arr = c.items ?? c.phrases ?? []
        arr.forEach((i) => {
          if (i.phrase && i.translation && i.phrase.split(' ').length >= 3) {
            phraseItems.push({ phrase: i.phrase, translation: i.translation })
          }
        })
      })

      // Collect vocab for distractors
      const vocabItems: WordPair[] = []
      vocabRes.data?.forEach((lesson) => {
        const c = lesson.content as { items?: Array<{ word: string; translation: string }> }
        c.items?.forEach((i) => {
          if (i.word && i.translation) vocabItems.push({ word: i.word, translation: i.translation })
        })
      })

      setPhrases(phraseItems)
      setVocabPool(vocabItems)
      setLoading(false)
    })
  }, [])

  const loadRound = useCallback(
    (currentPhrases: PhrasePair[], currentVocab: WordPair[], used: number[]) => {
      const available = currentPhrases.map((_, i) => i).filter((i) => !used.includes(i))
      if (available.length === 0) return null

      const pickedIdx = available[Math.floor(Math.random() * available.length)]
      const pair = currentPhrases[pickedIdx]
      const { display, blank: blankWord_ } = blankWord(pair.phrase)

      // Build distractors: Spanish words of similar length (±4 chars)
      const distractors = shuffle(
        currentVocab
          .map((v) => getMainWord(v.word))
          .filter(
            (w) =>
              w !== blankWord_ &&
              Math.abs(w.length - blankWord_.length) <= 4 &&
              w.length >= 3,
          ),
      ).slice(0, 3)

      // Fallback if not enough distractors
      while (distractors.length < 3) {
        distractors.push(blankWord_.split('').reverse().join(''))
      }

      const opts = shuffle([blankWord_, ...distractors])

      return {
        display,
        full: pair.phrase,
        translation: pair.translation,
        blank: blankWord_,
        options: opts,
        usedIdx: pickedIdx,
      }
    },
    [],
  )

  function startGame() {
    const roundData = loadRound(phrases, vocabPool, [])
    if (!roundData) return

    setRound(0)
    setScore(0)
    setRewards(null)
    setSelectedAnswer(null)
    setRoundState('answering')
    setDisplayPhrase(roundData.display)
    setFullPhrase(roundData.full)
    setTranslation(roundData.translation)
    setBlank(roundData.blank)
    setOptions(roundData.options)
    setUsedIndices([roundData.usedIdx])
    setPhase('playing')
  }

  function handleAnswer(option: string) {
    if (roundState !== 'answering') return
    setSelectedAnswer(option)
    const isCorrect = option === blank

    if (isCorrect) {
      setScore((prev) => prev + 1)
      setRoundState('correct')
    } else {
      setRoundState('wrong')
    }

    setTimeout(() => advanceRound(isCorrect), 1400)
  }

  async function advanceRound(wasCorrect: boolean) {
    const nextRound = round + 1
    if (nextRound >= TOTAL_ROUNDS) {
      const result = await saveGameResult(score + (wasCorrect ? 1 : 0), TOTAL_ROUNDS)
      setRewards(result)
      setPhase('finished')
      return
    }

    const roundData = loadRound(phrases, vocabPool, usedIndices)
    if (!roundData) {
      const result = await saveGameResult(score + (wasCorrect ? 1 : 0), TOTAL_ROUNDS)
      setRewards(result)
      setPhase('finished')
      return
    }

    setRound(nextRound)
    setDisplayPhrase(roundData.display)
    setFullPhrase(roundData.full)
    setTranslation(roundData.translation)
    setBlank(roundData.blank)
    setOptions(roundData.options)
    setSelectedAnswer(null)
    setRoundState('answering')
    setUsedIndices((prev) => [...prev, roundData.usedIdx])
  }

  // ── Ready Screen ─────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#021410' }}>
        <AppTopbar title="Fill in the Blank" back={{ href: '/play', label: 'Games' }} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            <div
              className="size-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
            >
              <PenLine size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white">Fill in the Blank</h1>
              <p className="text-emerald-400/70 mt-2 text-base">
                Complete the Spanish sentence with the right word!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Rounds', value: '10' },
                { label: 'Phrases', value: 'ES' },
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

            {loading && <p className="text-emerald-400/50 text-sm">Loading phrases…</p>}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              disabled={loading || phrases.length === 0}
              className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
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
      accuracy >= 80
        ? 'Grammar Guru!'
        : accuracy >= 50
          ? 'Solid Work!'
          : 'Keep Practicing!'

    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#021410' }}>
        <AppTopbar title="Fill in the Blank" back={{ href: '/play', label: 'Games' }} />
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
                style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
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
    <div className="flex flex-col min-h-screen" style={{ background: '#021410' }}>
      <AppTopbar title="Fill in the Blank" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full gap-5">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-400">Round {round + 1} / {TOTAL_ROUNDS}</span>
            <span className="text-white/40">{score} correct</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #059669, #0d9488)' }}
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
            {/* Sentence card */}
            <div
              className={cn(
                'rounded-3xl border p-6 transition-colors duration-300',
                roundState === 'correct'
                  ? 'bg-emerald-500/15 border-emerald-500/40'
                  : roundState === 'wrong'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-white/5 border-white/10',
              )}
            >
              {/* Show full phrase after answering */}
              <p className="text-2xl font-bold text-white leading-relaxed text-center">
                {roundState === 'answering' ? (
                  // Highlight the blank
                  displayPhrase.split('_____').map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="text-emerald-400 border-b-2 border-emerald-400 mx-0.5 px-1">
                          _____
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  // Show complete sentence — highlight the answer
                  fullPhrase.split(' ').map((word, i) => {
                    const clean = word.replace(/[,?.¿¡!]/g, '').toLowerCase()
                    const isAnswer = clean === blank
                    return (
                      <span
                        key={i}
                        className={cn(
                          'mx-0.5',
                          isAnswer &&
                            (roundState === 'correct'
                              ? 'text-emerald-400 font-extrabold'
                              : 'text-red-400 font-extrabold'),
                        )}
                      >
                        {word}{' '}
                      </span>
                    )
                  })
                )}
              </p>

              {/* Translation */}
              <p className="text-sm text-white/45 text-center mt-3 italic">{translation}</p>

              {/* Result label */}
              <AnimatePresence>
                {roundState === 'correct' && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-emerald-400 font-bold text-sm mt-3"
                  >
                    Correct!
                  </motion.p>
                )}
                {roundState === 'wrong' && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-red-400 font-bold text-sm mt-3"
                  >
                    The answer was: <span className="text-white">{blank}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Options — 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              {options.map((option) => {
                const isSelected = selectedAnswer === option
                const isCorrectOpt = option === blank

                let optStyle =
                  'bg-white/5 border-white/10 text-white hover:bg-emerald-500/20 hover:border-emerald-400/30'
                if (roundState !== 'answering') {
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
                    whileTap={{ scale: roundState === 'answering' ? 0.96 : 1 }}
                    onClick={() => handleAnswer(option)}
                    disabled={roundState !== 'answering'}
                    className={cn(
                      'rounded-2xl border p-4 text-sm font-bold text-center transition-all duration-200 min-h-[60px] flex items-center justify-center',
                      optStyle,
                    )}
                  >
                    {option}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Trophy watermark */}
        <div className="flex items-center justify-center mt-auto">
          <Trophy size={16} className="text-white/10" />
        </div>
      </main>
    </div>
  )
}
