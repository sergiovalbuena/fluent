import * as Sentry from '@sentry/nextjs'

// Error monitoring. Off until NEXT_PUBLIC_SENTRY_DSN is set (Vercel → Environment
// Variables); without it nothing is sent anywhere.
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    // Errors only: no performance traces
    tracesSampleRate: 0,
  })
}

// Errors thrown in server components, route handlers and server actions
export const onRequestError = Sentry.captureRequestError
