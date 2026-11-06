'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bold, useAuthError } from '@/components/auth/auth-parts'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const authError = useAuthError()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(authError(error))
      return
    }
    setSent(true)
  }

  return (
    <Card className="w-full max-w-sm border-primary/10">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🔑</div>
        <CardTitle className="text-2xl font-bold">{t('forgot_title')}</CardTitle>
        <CardDescription>{sent ? t('forgot_sent_subtitle') : t('forgot_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {t.rich('forgot_sent_body', { email, b: bold })}
            </p>
            <Button variant="outline" className="w-full border-primary/20" onClick={() => setSent(false)}>
              {t('forgot_resend')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
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
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
              {loading ? t('forgot_loading') : t('forgot_submit')}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> {t('back_to_login')}
        </Link>
      </CardContent>
    </Card>
  )
}
