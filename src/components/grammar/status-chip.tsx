'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import type { ModuleStatus } from '@/lib/grammar'

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
