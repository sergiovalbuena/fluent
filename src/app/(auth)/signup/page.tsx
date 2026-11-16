'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleButton, OrDivider, bold, useAuthError } from '@/components/auth/auth-parts'
import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics'

/** Seconds before the confirmation email can be sent again */
const RESEND_COOLDOWN = 60

// Without emailRedirectTo, Supabase sends users to the project's Site URL after confirming
const confirmRedirect = () => `${window.location.origin}/auth/callback?next=/onboarding`

export default function SignupPage() {
  const t = useTranslations('auth')
  const authError = useAuthError()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // Set once the confirmation email is on its way: the form gives way to "check your email"
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    trackEvent('signup_started', { method: 'email' })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name }, emailRedirectTo: confirmRedirect() },
    })
    setLoading(false)
    if (error) {
      toast.error(authError(error))
      return
    }
    // Email confirmation turned off in Supabase: already signed in
    if (data.session) {
      router.push('/onboarding')
      return
    }
    // An existing, confirmed email gets no error and no email (no identities): say so
    if (data.user && data.user.identities?.length === 0) {
      toast.error(t('err_user_exists'))
      return
    }
    setSentTo(email)
    setCooldown(RESEND_COOLDOWN)
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0) return
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: sentTo,
      options: { emailRedirectTo: confirmRedirect() },
    })
    if (error) {
      toast.error(authError(error))
      return
    }
    toast.success(t('resent'))
    setCooldown(RESEND_COOLDOWN)
  }

  async function handleGoogleLogin() {
    trackEvent('signup_started', { method: 'google' })
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (sentTo) {
    return (
      <Card className="w-full max-w-sm border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail size={26} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('check_title')}</CardTitle>
          <CardDescription className="leading-relaxed">
            {t.rich('check_body', { email: sentTo, b: bold })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground leading-relaxed">
            💡 {t('check_spam')}
          </p>
          <Button
            variant="outline"
            className="w-full border-primary/20 tabular-nums"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? t('resend_in', { s: cooldown }) : t('resend')}
          </Button>
          <button
            type="button"
            onClick={() => { setSentTo(null); setCooldown(0) }}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} /> {t('wrong_email')}
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm border-primary/10">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🌍</div>
        <CardTitle className="text-2xl font-bold">{t('signup_title')}</CardTitle>
        <CardDescription>{t('signup_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleButton onClick={handleGoogleLogin} />
        <OrDivider />
        <form onSubmit={handleSignup} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('name_placeholder')}
              required
            />
          </div>
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
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('password_hint')}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
            {loading ? t('signup_loading') : t('signup_submit')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t('have_account')}{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            {t('login_link')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
