import { createClient } from '@/lib/supabase/server'
import { MiniGamesContent } from '@/components/mini-games/mini-games-content'

export default async function MiniGamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let stats: { gemsFromGames: number; gamesToday: number } | null = null
  if (user) {
    // Each rewarded mini-game leaves a 'minigame' gem transaction
    const { data } = await supabase
      .from('gem_transactions')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('reason', 'minigame')
    const rows = (data ?? []) as { amount: number; created_at: string }[]
    const today = new Date().toISOString().slice(0, 10)
    stats = {
      gemsFromGames: rows.reduce((s, r) => s + Math.max(r.amount, 0), 0),
      gamesToday: rows.filter(r => r.created_at.slice(0, 10) === today).length,
    }
  }

  return <MiniGamesContent stats={stats} />
}
