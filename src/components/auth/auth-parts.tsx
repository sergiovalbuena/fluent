'use client'

import type { AuthError } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// Pieces shared by /login, /signup, /forgot-password and /reset-password

/** Supabase Auth error codes with a translated message (messages: auth.err_*) */
const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'err_invalid_credentials',
  email_not_confirmed: 'err_email_not_confirmed',
  user_already_exists: 'err_user_exists',
  email_exists: 'err_user_exists',
  weak_password: 'err_weak_password',
  over_email_send_rate_limit: 'err_rate_limit',
  over_request_rate_limit: 'err_rate_limit',
  email_address_invalid: 'err_email_invalid',
  validation_failed: 'err_email_invalid',
  same_password: 'err_same_password',
}

/** The error in the page's language (generic message for codes without a translation) */
export function useAuthError() {
  const t = useTranslations('auth')
  return (error: Pick<AuthError, 'code'> | null | undefined) =>
    t(ERROR_KEYS[error?.code ?? ''] ?? 'err_generic')
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations('auth')
  return (
    <Button variant="outline" className="w-full border-primary/20 hover:border-primary/40" onClick={onClick}>
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {t('google')}
    </Button>
  )
}

export function OrDivider() {
  const t = useTranslations('auth')
  return (
    <div className="flex items-center gap-2">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground">{t('or')}</span>
      <Separator className="flex-1" />
    </div>
  )
}

/** Bold part of a rich message (<b>…</b>) */
export const bold = (chunks: React.ReactNode) => <span className="font-semibold text-foreground">{chunks}</span>
