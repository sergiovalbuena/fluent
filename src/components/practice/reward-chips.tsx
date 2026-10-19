import { Gem } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * What something pays, the same everywhere in the app: "+15 XP" in the primary
 * color and gems in the topbar's gem color, with the gem icon.
 */
export function RewardChips({ xp, gems, size = 'sm', className }: { xp?: number; gems?: number; size?: 'sm' | 'md'; className?: string }) {
  if (!xp && !gems) return null
  const chip = size === 'md' ? 'rounded-lg px-2 py-0.5 text-xs' : 'rounded-md px-1.5 py-0.5 text-[10px]'
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      {xp ? (
        <span className={cn(chip, 'font-bold tabular-nums bg-primary/10 text-primary')}>+{xp} XP</span>
      ) : null}
      {gems ? <GemChip gems={gems} size={size} /> : null}
    </span>
  )
}

export function GemChip({ gems, size = 'sm', className }: { gems: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn(
      'flex items-center gap-0.5 font-bold tabular-nums bg-sky-500/10 text-sky-600 dark:text-sky-400',
      size === 'md' ? 'rounded-lg px-2 py-0.5 text-xs' : 'rounded-md px-1.5 py-0.5 text-[10px]',
      className,
    )}>
      <Gem size={size === 'md' ? 12 : 10} />+{gems}
    </span>
  )
}
