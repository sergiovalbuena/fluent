'use client'

import { motion } from 'framer-motion'
import { ArrowRight, RotateCcw, Star } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

const CONFETTI_COLORS = ['#ff8052', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 1.3 + Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 8 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    [],
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: 0,
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            rotate: p.rot,
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: '110vh', opacity: [1, 1, 0.2, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

type Props = {
  score: number
  xpEarned: number
  gemsEarned: number
  stars: 1 | 2 | 3
  milestoneBonusXp?: number
  onContinue: () => void
  onRestart: () => void
}

const MILESTONE_LABELS: Record<number, string> = {
  3:  '🔥 3-day streak!',
  7:  '🔥 7-day streak!',
  14: '🔥 14-day streak!',
}

export function ResultScreen({ score, xpEarned, gemsEarned, stars, milestoneBonusXp = 0, onContinue, onRestart }: Props) {
  const t = useTranslations('lesson')

  const emoji    = score === 100 ? '🏆' : score >= 80 ? '⭐' : score >= 60 ? '🎉' : '💪'
  const headline = score === 100 ? t('perfect_score') : score >= 80 ? t('excellent') : score >= 60 ? t('well_done') : t('keep_going')

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-8 py-16 px-6 overflow-hidden bg-[#f8f6f5] dark:bg-[#23140f]">
      <Confetti />

      <motion.div
        className="flex flex-col items-center gap-6 relative z-10"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 }}
      >
        <span className="text-6xl md:text-8xl">{emoji}</span>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold">{headline}</h2>
          <p className="text-muted-foreground text-sm">{t('lesson_complete')}</p>
        </div>

        {/* Stars row */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(n => (
            <motion.div
              key={n}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                delay: 0.4 + (n - 1) * 0.15,
              }}
            >
              <Star
                size={36}
                className={
                  n <= stars
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                    : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                }
              />
            </motion.div>
          ))}
        </div>

        {/* Rewards row */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {score < 100 && (
            <div className="flex flex-col items-center gap-1 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-black/5">
              <span className="text-2xl font-bold">{score}%</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('your_score')}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1 bg-primary/10 rounded-2xl px-4 py-3 border border-primary/20">
            <span className="text-2xl font-bold text-primary">+{xpEarned}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary/70">{t('xp_earned')}</span>
          </div>
          {gemsEarned > 0 && (
            <div className="flex flex-col items-center gap-1 bg-amber-400/10 rounded-2xl px-4 py-3 border border-amber-400/20">
              <span className="text-2xl font-bold text-amber-500">+{gemsEarned}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500/70">{t('gems_earned')}</span>
            </div>
          )}
        </div>

        {/* Streak milestone banner */}
        {milestoneBonusXp > 0 && (
          <motion.div
            className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 rounded-2xl px-5 py-3"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 350, damping: 22 }}
          >
            <span className="text-sm font-bold text-orange-500">
              {MILESTONE_LABELS[milestoneBonusXp > 20 ? 14 : milestoneBonusXp > 10 ? 7 : 3]} +{milestoneBonusXp} XP bonus
            </span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 w-full max-w-xs relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25"
        >
          {t('continue')} <ArrowRight size={16} />
        </button>
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold active:scale-95 transition-transform"
        >
          <RotateCcw size={13} /> {t('practice_again')}
        </button>
      </motion.div>
    </div>
  )
}
