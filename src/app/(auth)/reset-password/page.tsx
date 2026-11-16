'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthError } from '@/components/auth/auth-parts'
import { toast } from 'sonner'

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const t = useTranslations('auth')
  const authError = useAuthError()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  // ?new=1: a guest who just confirmed their email creates the password (not a reset)
  const isNew = use(searchParams).new === '1'
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error(t('passwords_mismatch'))
      return
    }
    if (password.length < 6) {
      toast.error(t('password_short'))
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(authError(error))
      setLoading(false)
      return
    }
    toast.success(t(isNew ? 'account_ready' : 'password_updated'))
    router.push(isNew ? '/learn' : '/dashboard')
  }

  return (
    <Card className="w-full max-w-sm border-primary/10">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🔒</div>
        <CardTitle className="text-2xl font-bold">{t(isNew ? 'set_password_title' : 'reset_title')}</CardTitle>
        <CardDescription>{t(isNew ? 'set_password_subtitle' : 'reset_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="password">{t('new_password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('new_password_placeholder')}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">{t('confirm_password')}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={t('confirm_placeholder')}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white mt-1" disabled={loading}>
            {loading ? t('reset_loading') : t('reset_submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
