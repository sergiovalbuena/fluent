'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/dashboard/language-switcher'
import { ChevronLeft, Flame, Star, Gem, Zap } from 'lucide-react'
import { useTopbarStats } from '@/components/providers/topbar-provider'
import { createClient } from '@/lib/supabase/client'
import { getActiveBoosts, type ActiveBoosts } from '@/lib/rewards'

// Boosts bought in the gem shop live in the database (user_boosts)
function useActiveBoost() {
  const [boosts, setBoosts] = useState<ActiveBoosts>({ xp: null, gems: null })
  const [now, setNow] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    const load = () => supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) getActiveBoosts(supabase, user.id).then(b => { if (!cancelled) setBoosts(b) })
    })
    load()
    const refresh = setInterval(load, 60_000)
    const tick = setInterval(() => setNow(Date.now()), 5_000)
    return () => { cancelled = true; clearInterval(refresh); clearInterval(tick) }
  }, [])
  if (boosts.xp && boosts.xp > now) return '2× XP'
  if (boosts.gems && boosts.gems > now) return '2× 💎'
  return null
}

interface AppTopbarProps {
  title?: string
  subtitle?: string
  back?: { href: string; label?: string }
}

export function AppTopbar({ title, subtitle, back }: AppTopbarProps) {
  const stats = useTopbarStats()
  const activeBoost = useActiveBoost()

  return (
    <header className="sticky top-0 z-20 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#1b2030]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-8 h-14">
        {/* Left side */}
        {back ? (
          <div className="flex items-center gap-1.5">
            <Link href={back.href}>
              <button className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors">
                <ChevronLeft size={20} />
              </button>
            </Link>
            {back.label && (
              <span className="text-sm font-semibold text-muted-foreground">{back.label}</span>
            )}
          </div>
        ) : (
          <>
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2">
              <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
              <span className="font-bold">Fluent</span>
            </div>
            {/* Desktop: title */}
            <p className="hidden md:block text-sm font-semibold text-muted-foreground">
              {title ?? ''}
              {subtitle && <span className="text-muted-foreground/60 ml-1.5">{subtitle}</span>}
            </p>
          </>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto mr-3">
          <LanguageSwitcher />

          {/* Active boost pill */}
          {activeBoost && (
            <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-600 dark:text-yellow-300 px-2.5 py-1 rounded-full text-[11px] font-black animate-pulse">
              <Zap size={10} />
              {activeBoost}
            </div>
          )}

          {/* Streak */}
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold">
            <Flame size={12} />
            {stats.streak}
          </div>

          {/* XP */}
          <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-bold">
            <Star size={12} />
            {stats.xp} XP
          </div>

          {/* Gems */}
          <Link href="/gems" className="hidden md:flex items-center gap-1.5 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors px-3 py-1 rounded-full text-xs font-bold">
            <Gem size={12} />
            {stats.gems}
          </Link>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
