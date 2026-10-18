'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Multiple-choice round shared by Short Video and Short Story (dark game style).
// The prompt can mark a gap with "___".

export type ChoiceQuestion = { q: string; options: string[]; answer: string; hint?: string }

export function ChoiceQuiz({ questions, accent, onDone }: {
  questions: ChoiceQuestion[]
  /** Tailwind color family for the accents, e.g. "orange" */
  accent: { text: string; border: string; bar: string; button: string }
  onDone: (correct: number) => void
}) {
  const t = useTranslations('games')
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const q = questions[index]
  const revealed = picked !== null

  function pick(option: string) {
    if (revealed) return
    setPicked(option)
    if (option === q.answer) setCorrect(c => c + 1)
  }

  function next() {
    if (index + 1 >= questions.length) { onDone(correct); return }
    setIndex(index + 1)
    setPicked(null)
  }

  const parts = q.q.split('___')

  return (
    <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6 mt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/40">{t('question_of', { n: index + 1, total: questions.length })}</span>
        <span className={cn('font-bold', accent.text)}>{t('n_correct', { n: correct })}</span>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', accent.bar)} style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className={cn('bg-white/[0.04] border rounded-3xl p-6', accent.border)}>
        <p className="text-white text-xl font-bold leading-snug">
          {parts.length === 2 ? (
            <>
              {parts[0]}
              <span className={cn('inline-block min-w-16 border-b-2 border-dashed px-1 text-center', accent.text, accent.border)}>
                {revealed ? q.answer : ' '}
              </span>
              {parts[1]}
            </>
          ) : q.q}
        </p>
        {q.hint && <p className="mt-2 text-sm text-white/40">{q.hint}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {q.options.map(option => {
          const isAnswer = option === q.answer
          let style = 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
          if (revealed) {
            if (isAnswer) style = 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
            else if (option === picked) style = 'bg-red-500/20 border-red-400 text-red-300'
            else style = 'bg-white/5 border-white/10 text-white/30'
          }
          return (
            <button
              key={option}
              type="button"
              onClick={() => pick(option)}
              disabled={revealed}
              className={cn('w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-sm transition-all', style)}
            >
              {option}
            </button>
          )
        })}
      </div>

      {revealed && (
        <button type="button" onClick={next} className={cn('w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02]', accent.button)}>
          {index + 1 >= questions.length ? t('see_results') : t('next_question')}
        </button>
      )}
    </motion.div>
  )
}

/** Result card shared by the quiz games */
export function QuizResult({ title, correct, total, rewards, onAgain, againLabel, accent }: {
  title: string
  correct: number
  total: number
  rewards: { xp: number; gems: number } | null
  onAgain: () => void
  againLabel: string
  accent: { text: string; button: string }
}) {
  const t = useTranslations('games')
  const pct = total ? Math.round((correct / total) * 100) : 0
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 mt-8 text-center">
      <span className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪'}</span>
      <div>
        <h2 className="text-3xl font-bold text-white">{pct >= 80 ? t('headline_great') : pct >= 50 ? t('headline_good') : t('headline_keep')}</h2>
        <p className="text-white/40 text-sm mt-1">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className={cn('text-4xl font-bold tabular-nums', accent.text)}>{correct}/{total}</p>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{t('stat_correct')}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-white text-4xl font-bold tabular-nums">{pct}%</p>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{t('stat_accuracy')}</p>
        </div>
      </div>
      {rewards && (
        <div className="flex gap-3 text-lg font-bold">
          <span className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-2.5 text-yellow-400">+{rewards.xp} XP</span>
          <span className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-5 py-2.5 text-sky-300">+{rewards.gems} 💎</span>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onAgain} className={cn('px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105', accent.button)}>
          {againLabel}
        </button>
        <a href="/mini-games" className="px-6 py-3 rounded-2xl text-sm font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-all">
          {t('back_to_games')}
        </a>
      </div>
    </motion.div>
  )
}
