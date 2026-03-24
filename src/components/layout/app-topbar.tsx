'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/dashboard/language-switcher'
import { ChevronLeft, Flame, Star, Gem, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

function useActiveBoost() {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    const check = () => {
      const now = Date.now()
      const xp = Number(localStorage.getItem('fluent_boost_xp_expires') ?? 0)
      const gems = Number(localStorage.getItem('fluent_boost_gems_expires') ?? 0)
      if (xp > now) { setLabel('2× XP'); return }
      if (gems > now) { setLabel('2× Gems'); return }
      setLabel(null)
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])
  return label
}

interface AppTopbarProps {
  title?: string
  subtitle?: string
  back?: { href: string; label?: string }
}

export function AppTopbar({ title, subtitle, back }: AppTopbarProps) {
  const [stats, setStats] = useState({ streak: 0, xp: 0, gems: 0 })
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Initial fetch
      supabase
        .from('user_profiles')
        .select('streak_count, total_xp, total_gems')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setStats({ streak: data.streak_count, xp: data.total_xp, gems: data.total_gems })
        })

      // Realtime: refresh whenever the profile row is updated (e.g. post-lesson)
      channelRef.current = supabase
        .channel(`topbar-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const d = payload.new as { streak_count: number; total_xp: number; total_gems: number }
            setStats({ streak: d.streak_count, xp: d.total_xp, gems: d.total_gems })
          },
        )
        .subscribe()
    })

    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current)
      }
    }
  }, [])


  const activeBoost = useActiveBoost()

  return (
    <header className="sticky top-0 z-20 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#23140f]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-8 h-14">
        {/* Left side */}
        {back ? (
          <div className="flex items-center gap-1.5">
            <Link href={back.href}>
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors">
                <ChevronLeft size={18} />
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
            <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-600 dark:text-yellow-300 px-2.5 py-1 rounded-full text-[10px] font-black animate-pulse">
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
          <div className="hidden md:flex items-center gap-1.5 bg-amber-400/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold">
            <Gem size={12} />
            {stats.gems}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
