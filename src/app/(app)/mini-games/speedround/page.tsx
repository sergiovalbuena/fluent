'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Clock, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { usePracticeContent } from '@/lib/practice-source'
import { getLanguage } from '@/lib/languages'
import { AppTopbar } from '@/components/layout/app-topbar'
import { SourcePicker } from '@/components/mini-games/source-picker'
import { createClient } from '@/lib/supabase/client'
import { addRewards } from '@/lib/rewards'
import { getAuthUser } from '@/lib/supabase/auth'

// ── Types ─────────────────────────────────────────────────────────────────────
type WordPair = { word: string; translation: string }
/** promptLang is the language the prompt is written in (shown as a flag) */
type Question = { prompt: string; promptLang: string; answer: string; options: string[] }
type Phase = 'ready' | 'playing' | 'finished'
type AnswerState = 'idle' | 'correct' | 'wrong'
type Rewards = { xp: number; gems: number }

const GAME_SECONDS = 60
const BATCH_SIZE = 40

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const distinctCount = (values: string[]) => new Set(values).size

/** The game needs at least 4 different values on each side to offer 4 distinct options */
function canPlay(pool: WordPair[]): boolean {
  return distinctCount(pool.map(p => p.word)) >= 4 && distinctCount(pool.map(p => p.translation)) >= 4
}

/**
 * One shuffled pass over the pool. Directions alternate (target → translation, then
 * translation → target). Distractors are distinct values that are not also a valid
 * answer for the same prompt (e.g. two translations of the same word).
 */
function buildBatch(pool: WordPair[], targetLang: string, translationLang: string, avoidFirst?: string): Question[] {
  const items = shuffle(pool).slice(0, BATCH_SIZE)
  // Don't start a new batch with the prompt the previous one ended on
  if (avoidFirst && items.length > 1 && (items[0].word === avoidFirst || items[0].translation === avoidFirst)) {
    items.push(items.shift()!)
  }
  const questions: Question[] = []
  items.forEach((item, i) => {
    const fromTarget = i % 2 === 0
    const prompt = fromTarget ? item.word : item.translation
    const answer = fromTarget ? item.translation : item.word
    const side = (p: WordPair) => (fromTarget ? p.translation : p.word)
    const promptSide = (p: WordPair) => (fromTarget ? p.word : p.translation)
    const validAnswers = new Set(pool.filter(p => promptSide(p) === prompt).map(side))
    const candidates = [...new Set(pool.map(side))].filter(v => !validAnswers.has(v))
    const wrong = shuffle(candidates).slice(0, 3)
    if (wrong.length < 3) return
    questions.push({
      prompt,
      promptLang: fromTarget ? targetLang : translationLang,
      answer,
      options: shuffle([answer, ...wrong]),
    })
  })
  return questions
}

async function saveGameResult(correct: number, total: number): Promise<Rewards> {
  // Nothing to reward if the player didn't get a single answer right
  if (correct === 0) return { xp: 0, gems: 0 }
  const supabase = createClient()
  const {
    data: { user },
  } = await getAuthUser(supabase)
  if (!user) return { xp: 0, gems: 0 }
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const xp = pct >= 80 ? 15 : pct >= 60 ? 10 : 5
  return addRewards(supabase, user.id, { xp, gems: 3, reason: 'minigame' })
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SpeedRoundPage() {
  const { languageCode, translationLang } = useActiveLanguage()
  const t = useTranslations('games')
  const tm = useTranslations('mini_games')
  // Words from the source chosen on /mini-games (all lessons or one)
  const practice = usePracticeContent(languageCode, translationLang)
  const pool = useMemo<WordPair[]>(() => practice.words.map(w => ({ word: w.word, translation: w.translation })), [practice.words])
  const loading = practice.loading
  const playable = canPlay(pool)
  const [phase, setPhase] = useState<Phase>('ready')
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [rewards, setRewards] = useState<Rewards | null>(null)

  // Refs mirror the values the timer and timeouts need, so they never read stale state
  const phaseRef = useRef<Phase>('ready')
  const scoreRef = useRef(0)
  const answeredRef = useRef(0)
  const timeLeftRef = useRef(GAME_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockRef = useRef(false)

  const stopClocks = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (advanceRef.current) clearTimeout(advanceRef.current)
    timerRef.current = null
    advanceRef.current = null
  }, [])

  // Runs once per game: the phase guard stops the timer and the last answer both finishing it
  const finishGame = useCallback(async () => {
    if (phaseRef.current !== 'playing') return
    phaseRef.current = 'finished'
    stopClocks()
    lockRef.current = true
    setPhase('finished')
    setRewards(await saveGameResult(scoreRef.current, answeredRef.current))
  }, [stopClocks])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1)
      setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current === 0) finishGame()
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, finishGame])

  // Leaving the page mid-game cancels the pending timers
  useEffect(() => stopClocks, [stopClocks])

  function startGame() {
    stopClocks()
    setQuestions(buildBatch(pool, languageCode, translationLang))
    setQIndex(0)
    setScore(0)
    setAnswered(0)
    setCombo(0)
    setTimeLeft(GAME_SECONDS)
    setAnswerState('idle')
    setSelectedOption(null)
    setRewards(null)
    scoreRef.current = 0
    answeredRef.current = 0
    timeLeftRef.current = GAME_SECONDS
    lockRef.current = false
    phaseRef.current = 'playing'
    setPhase('playing')
  }

  function handleAnswer(option: string) {
    if (lockRef.current || phaseRef.current !== 'playing') return
    lockRef.current = true
    const q = questions[qIndex]
    const isCorrect = option === q.answer
    setSelectedOption(option)
    answeredRef.current += 1
    setAnswered(answeredRef.current)

    if (isCorrect) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      setCombo((prev) => prev + 1)
      setAnswerState('correct')
    } else {
      setCombo(0)
      setAnswerState('wrong')
    }
    advanceRef.current = setTimeout(advanceQuestion, isCorrect ? 400 : 800)
  }

  function advanceQuestion() {
    advanceRef.current = null
    if (phaseRef.current !== 'playing') return
    const next = qIndex + 1
    // Endless: queue a new shuffled pass before the current one runs out
    if (next >= questions.length - 1) {
      const last = questions[questions.length - 1]?.prompt
      setQuestions((prev) => [...prev, ...buildBatch(pool, languageCode, translationLang, last)])
    }
    if (next >= questions.length) {
      finishGame()
      return
    }
    setQIndex(next)
    setAnswerState('idle')
    setSelectedOption(null)
    lockRef.current = false
  }

  const currentQ = questions[qIndex]
  const timerPct = (timeLeft / GAME_SECONDS) * 100
  const timerRed = timeLeft <= 10

  // ── Ready Screen ─────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#0d0f18' }}>
        <AppTopbar title={tm('speedround_title')} back={{ href: '/mini-games', label: tm('title') }} />
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
              <h1 className="text-4xl font-bold text-white">{tm('speedround_title')}</h1>
              <p className="text-amber-400/70 mt-2 text-base">
                {tm('speedround_desc')}
              </p>
            </div>
            {/* Where the words come from (shared by all mini-games) */}
            <SourcePicker tone="dark" className="w-full" />

            {/* Stat boxes */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: t('stat_time'), value: '60s', icon: Clock },
                { label: t('stat_questions'), value: '∞', icon: Zap },
                { label: t('stat_reward'), value: '+3 💎', icon: Trophy },
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
              <p className="text-amber-400/50 text-sm">{t('loading')}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              disabled={loading || !playable}
              className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            >
              {loading ? t('loading') : t('start')}
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
      finalAccuracy >= 80 ? t('headline_great') : finalAccuracy >= 50 ? t('headline_good') : t('headline_keep')

    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#0d0f18' }}>
        <AppTopbar title={tm('speedround_title')} back={{ href: '/mini-games', label: tm('title') }} />
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
                {t('score_of', { score, total: answered })}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: t('stat_correct'), value: score.toString() },
                { label: t('stat_accuracy'), value: `${finalAccuracy}%` },
                { label: t('stat_xp'), value: rewards ? `+${rewards.xp}` : '…' },
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

            {rewards && rewards.gems > 0 && (
              <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 px-5 py-2.5 rounded-xl font-bold">
                +{rewards.gems} 💎 {t('stat_gems')}
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startGame}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-lg"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
              >
                {t('play_again')}
              </motion.button>
              <Link href="/mini-games" className="w-full">
                <button className="w-full py-3.5 rounded-2xl bg-white/8 border border-white/12 text-white/70 font-bold text-base hover:bg-white/12 transition-colors">
                  {t('back_to_games')}
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
    <div className="flex flex-col min-h-screen" style={{ background: '#0d0f18' }}>
      <AppTopbar title={tm('speedround_title')} back={{ href: '/mini-games', label: tm('title') }} />

      <main className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full gap-4">
        {/* Timer bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={cn('tabular-nums', timerRed ? 'text-red-400' : 'text-amber-400')}>
              {timeLeft}s
            </span>
            <span className="text-white/40">{t('n_correct', { n: score })}</span>
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
                {t('combo', { n: Math.min(combo, 5) })}
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
                  'relative rounded-3xl p-6 flex items-center justify-center min-h-[140px] transition-colors duration-200',
                  answerState === 'correct'
                    ? 'bg-emerald-500/20 border border-emerald-500/40'
                    : answerState === 'wrong'
                      ? 'bg-red-500/20 border border-red-500/40'
                      : 'bg-white/5 border border-white/10',
                )}
              >
                {/* Language of the prompt: it alternates between the course language and the translation */}
                <span
                  className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/60"
                  title={getLanguage(currentQ.promptLang).nativeName}
                >
                  <span className="text-base leading-none">{getLanguage(currentQ.promptLang).flag}</span>
                  {getLanguage(currentQ.promptLang).nativeName}
                </span>
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
            {t('question_n', { n: qIndex + 1, answered })}
          </span>
        </div>
      </main>
    </div>
  )
}
