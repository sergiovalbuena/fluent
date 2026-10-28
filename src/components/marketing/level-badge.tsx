import { cn } from '@/lib/utils'

// CEFR level chip (shared by server and client marketing components)

const LEVEL_STYLES: Record<string, string> = {
  A1: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  A2: 'bg-teal-500/12 text-teal-700 dark:text-teal-400',
  B1: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  B2: 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-400',
  C1: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
}

export function LevelBadge({ level, className }: { level: string; className?: string }) {
  return <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-wide', LEVEL_STYLES[level], className)}>{level}</span>
}
