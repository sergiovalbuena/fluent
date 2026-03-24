'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Lock, Star, CheckCircle2, XCircle, ChevronRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface QuizItem {
  question: string
  options: string[]
  answer: string
}

interface Props {
  slug: string
  moduleTitle: string
  moduleIcon: string
  quizItems: QuizItem[]
  allThreeStars: boolean
  hasCrown: boolean
  userId: string | null
  lessonIds: string[]
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildOptions(items: QuizItem[], correct: string): string[] {
  const wrong = shuffle(items.map(i => i.answer).filter(a => a !== correct)).slice(0, 3)
  return shuffle([correct, ...wrong])
}

type Phase = 'locked' | 'intro' | 'quiz' | 'result'

export function MasteryContent({ moduleTitle, moduleIcon, quizItems, allThreeStars, hasCrown, userId, lessonIds }: Props) {
  const [phase, setPhase] = useState<Phase>(hasCrown ? 'result' : allThreeStars ? 'intro' : 'locked')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [crownEarned, setCrownEarned] = useState(hasCrown)

  const questions = quizItems.slice(0, 10).map(item => ({
    ...item,
    displayOptions: buildOptions(quizItems, item.answer),
  }))

  const totalQ = questions.length

  async function awardCrown() {
    if (!userId || lessonIds.length === 0) return
    const supabase = createClient()
    // Mark all lessons with has_crown = true
    await supabase
      .from('user_progress')
      .upsert(
        lessonIds.map(id => ({ user_id: userId, lesson_id: id, has_crown: true })),
        { onConflict: 'user_id,lesson_id' }
      )
    // Increment user crown count
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_crowns')
      .eq('user_id', userId)
      .maybeSingle()
    await supabase
      .from('user_profiles')
      .update({ total_crowns: (profile?.total_crowns ?? 0) + 1 })
      .eq('user_id', userId)
    window.dispatchEvent(new CustomEvent('gems-earned', { detail: { amount: 20, reason: `Crown earned: ${moduleTitle}! 👑` } }))
    setCrownEarned(true)
  }

  function handleSelect(option: string) {
    if (selected !== null) return
    setSelected(option)
    const correct = option === questions[current].answer
    if (correct) setScore(s => s + 1)

    setTimeout(() => {
      if (current + 1 >= totalQ) {
        const finalScore = score + (correct ? 1 : 0)
        const passed = finalScore / totalQ >= 0.7
        if (passed && !crownEarned) awardCrown()
        setPhase('result')
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
      }
    }, 900)
  }

  const finalScore = phase === 'result' ? score : 0
  const passed = finalScore / totalQ >= 0.7

  if (phase === 'locked') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock size={36} className="text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Crown Challenge Locked</h2>
          <p className="text-muted-foreground max-w-sm">
            Earn ⭐⭐⭐ on all lessons in <strong>{moduleTitle}</strong> to unlock the Crown Challenge.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-2">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span>All lessons must have 3 stars</span>
        </div>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6"
      >
        <div className="text-6xl">{moduleIcon}</div>
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full mb-3">
            <Crown size={12} /> CROWN CHALLENGE
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{moduleTitle}</h2>
          <p className="text-muted-foreground max-w-sm">
            Prove you've mastered this module. Answer {totalQ} questions — get 70% or more to earn your Crown.
          </p>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span className="bg-muted/60 rounded-xl px-3 py-1.5">{totalQ} questions</span>
          <span className="bg-muted/60 rounded-xl px-3 py-1.5">70% to pass</span>
          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl px-3 py-1.5">+20 gems</span>
        </div>
        <button
          onClick={() => setPhase('quiz')}
          className="flex items-center gap-2 bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary/90 transition-colors"
        >
          Start Challenge <ChevronRight size={18} />
        </button>
      </motion.div>
    )
  }

  if (phase === 'quiz') {
    const q = questions[current]
    return (
      <div className="space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((current) / totalQ) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">{current + 1}/{totalQ}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-[#2c1a12] rounded-3xl border border-black/[0.04] dark:border-white/[0.05] p-6">
              <p className="text-lg font-semibold text-foreground">{q.question}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {q.displayOptions.map(option => {
                const isSelected = selected === option
                const isCorrect = option === q.answer
                const showFeedback = selected !== null

                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    disabled={selected !== null}
                    className={cn(
                      'w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all',
                      !showFeedback && 'border-border bg-white dark:bg-[#2c1a12] hover:border-primary/50 hover:bg-primary/5',
                      showFeedback && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                      showFeedback && isSelected && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
                      showFeedback && !isSelected && !isCorrect && 'border-border bg-white dark:bg-[#2c1a12] opacity-50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showFeedback && isCorrect && <CheckCircle2 size={18} className="text-green-500" />}
                      {showFeedback && isSelected && !isCorrect && <XCircle size={18} className="text-red-500" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // Result
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6"
    >
      <div className={cn(
        'w-24 h-24 rounded-3xl flex items-center justify-center text-5xl',
        crownEarned || hasCrown ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted/50'
      )}>
        {crownEarned || hasCrown ? '👑' : '😅'}
      </div>

      <div>
        {crownEarned || hasCrown ? (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Crown Earned!</h2>
            <p className="text-muted-foreground">
              You've mastered <strong>{moduleTitle}</strong>. This knowledge is yours for life.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Not quite…</h2>
            <p className="text-muted-foreground">
              You scored {finalScore}/{totalQ}. You need 70% to earn the Crown. Keep practicing!
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-muted/60 rounded-2xl px-5 py-3 text-center">
          <div className="text-2xl font-black text-foreground">{finalScore}/{totalQ}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Score</div>
        </div>
        {(crownEarned || hasCrown) && (
          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-2xl px-5 py-3 text-center">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Crown size={22} /> 1
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Crown</div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!passed && (
          <button
            onClick={() => { setCurrent(0); setSelected(null); setScore(0); setPhase('quiz') }}
            className="flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors"
          >
            Try Again <Trophy size={16} />
          </button>
        )}
        <a
          href="/learn"
          className="flex items-center gap-2 bg-muted text-foreground font-bold px-6 py-3 rounded-2xl hover:bg-muted/80 transition-colors"
        >
          Back to Modules
        </a>
      </div>
    </motion.div>
  )
}
