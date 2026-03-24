'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { Gem } from 'lucide-react'

// Dispatch this event anywhere in the app to trigger a gems toast:
// window.dispatchEvent(new CustomEvent('gems-earned', { detail: { amount: 5, reason: 'Completed lesson' } }))

export type GemsEarnedDetail = {
  amount: number
  reason?: string
}

export function GemsToastProvider() {
  useEffect(() => {
    function handleGemsEarned(e: Event) {
      const { amount, reason } = (e as CustomEvent<GemsEarnedDetail>).detail

      toast.custom(() => (
        <div className="flex items-center gap-3 bg-white dark:bg-[#2c1a12] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl px-4 py-3 shadow-lg shadow-black/[0.08] min-w-[200px]">
          <div
            className="size-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
          >
            <Gem size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              +{amount} Gems
            </p>
            {reason && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{reason}</p>
            )}
          </div>
        </div>
      ), {
        duration: 3000,
        position: 'bottom-right',
      })
    }

    window.addEventListener('gems-earned', handleGemsEarned)
    return () => window.removeEventListener('gems-earned', handleGemsEarned)
  }, [])

  return null
}
