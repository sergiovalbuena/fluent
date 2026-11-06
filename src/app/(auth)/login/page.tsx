'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleButton, OrDivider, useAuthError } from '@/components/auth/auth-parts'
import { toast } from 'sonner'

export default function LoginPage() {
  const t = useTranslations('auth')
  const authError = useAuthError()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // /auth/callback sends here with ?error=… when a confirmation or Google link fails
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('error')) toast.error(t('err_callback'))
  }, [t])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(authError(error))
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <Card className="w-full max-w-sm border-primary/10">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🌍</div>
        <CardTitle className="text-2xl font-bold">{t('login_title')}</CardTitle>
        <CardDescription>{t('login_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleButton onClick={handleGoogleLogin} />
        <OrDivider />
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              required
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('password')}</Label>
              <Link href="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                {t('forgot_link')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
            {loading ? t('login_loading') : t('login_submit')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t('no_account')}{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            {t('signup_link')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
