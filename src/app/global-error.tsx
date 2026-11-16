'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Last resort: an error in the root layout itself. It replaces the whole page,
// so it carries its own <html> and can't rely on providers or app styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f8f6f5', color: '#23140f' }}>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong · Algo salió mal</h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
            Your progress is saved. Try again. · Tu progreso está guardado. Inténtalo de nuevo.
          </p>
          <button
            onClick={reset}
            style={{ background: '#ff8052', color: '#fff', border: 0, borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Retry · Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
