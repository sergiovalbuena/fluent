'use client'

import { motion } from 'framer-motion'

// Result-screen pieces shared by the practice modes (verbs, grammar)

export function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] py-3">
      {icon}
      <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  )
}

export function ScoreRing({ pct, size = 'md' }: { pct: number; size?: 'sm' | 'md' }) {
  const r = 44
  const c = 2 * Math.PI * r
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#ff8052' : '#f59e0b'
  return (
    <div className={size === 'sm' ? 'relative size-11' : 'relative size-28'}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth={size === 'sm' ? 10 : 8} className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" strokeWidth={size === 'sm' ? 10 : 8} strokeLinecap="round" stroke={color}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <span className={size === 'sm'
        ? 'absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-slate-700 dark:text-slate-200'
        : 'absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums text-slate-900 dark:text-white'}
      >
        {pct}%
      </span>
    </div>
  )
}
