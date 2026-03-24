import { createClient } from '@/lib/supabase/server'
import { GemsPageContent } from '@/components/gems/gems-content'

export default async function GemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let totalGems = 0
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('total_gems')
      .eq('user_id', user.id)
      .maybeSingle()
    totalGems = data?.total_gems ?? 0
  }

  return <GemsPageContent totalGems={totalGems} userId={user?.id ?? null} />
}
