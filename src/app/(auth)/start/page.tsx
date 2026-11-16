'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

// "Start" on the marketing site: try lesson 1 before signing up. Creates a guest
// (Supabase anonymous sign-in) and goes to the welcome; the guest keeps everything
// when they create the account later (same user). If anonymous sign-ins are off in
// Supabase, it falls back to the normal sign-up.
export default function StartPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const supabase = createClient()
      // A guest coming back keeps their guest account
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { router.replace('/onboarding'); return }
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('[start] guest sign-in failed:', error.message)
        router.replace('/signup')
        return
      }
      trackEvent('signup_started', { method: 'guest' })
      router.replace('/onboarding')
      router.refresh()
    })()
  }, [router])

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader2 size={28} className="animate-spin text-primary" />
      <p className="text-sm font-semibold text-muted-foreground">{t('start_loading')}</p>
    </div>
  )
}
