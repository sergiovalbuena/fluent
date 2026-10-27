'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import type { GrammarLevel, ModuleStatus } from '@/lib/grammar'
import { cn } from '@/lib/utils'

const LEVEL_COLORS: Record<GrammarLevel, string> = {
  A1: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  A2: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  B1: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  B2: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  C1: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

/** CEFR level (A1 … C1) */
export function LevelChip({ level }: { level: GrammarLevel }) {
  const t = useTranslations('grammar')
  return (
    <span title={t('level_hint', { level })} className={cn('rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide', LEVEL_COLORS[level])}>
      {level}
    </span>
  )
}

export function StatusChip({ status }: { status: ModuleStatus }) {
  const t = useTranslations('grammar')
  if (status === 'mastered') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        <Check size={11} strokeWidth={3} /> {t('status_mastered')}
      </span>
    )
  }
  if (status === 'started') {
    return <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{t('status_started')}</span>
  }
  return null
}
