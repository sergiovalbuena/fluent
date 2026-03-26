'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface TopbarStats {
  streak: number
  xp: number
  gems: number
}

const TopbarContext = createContext<TopbarStats>({ streak: 0, xp: 0, gems: 0 })

export function useTopbarStats() {
  return useContext(TopbarContext)
}

export function TopbarProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<TopbarStats>({ streak: 0, xp: 0, gems: 0 })
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const userId = session.user.id

      supabase
        .from('user_profiles')
        .select('streak_count, total_xp, total_gems')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setStats({ streak: data.streak_count, xp: data.total_xp, gems: data.total_gems })
        })

      channelRef.current = supabase
        .channel(`topbar-stats-${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userId}` },
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

  return <TopbarContext.Provider value={stats}>{children}</TopbarContext.Provider>
}
