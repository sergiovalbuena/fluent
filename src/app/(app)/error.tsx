'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Any error while loading or rendering a page of the app: the sidebar stays, and
// the learner can retry or go back to the dashboard instead of seeing a blank page.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common')

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-primary/10 bg-white p-6 text-center dark:bg-slate-800/50">
        <p className="text-3xl">😵‍💫</p>
        <h1 className="mt-3 text-lg font-bold">{t('error')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('error_desc')}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            <RotateCcw size={15} />
            {t('retry')}
          </button>
          <Link href="/dashboard" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">
            {t('back_home')}
          </Link>
        </div>
      </div>
    </main>
  )
}
