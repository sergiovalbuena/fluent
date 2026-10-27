'use client'

import { useCallback, useEffect, useState } from 'react'

export type MariaUsage = { remaining: number; limit: number }

/** Daily MarIA messages left: loaded when `enabled`, then updated from each /api/maria reply */
export function useMariaUsage(enabled: boolean) {
  const [usage, setUsage] = useState<MariaUsage | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/maria')
      .then(res => (res.ok ? (res.json() as Promise<MariaUsage>) : null))
      .then(data => { if (!cancelled && data) setUsage(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [enabled])

  const updateFrom = useCallback((res: Response) => {
    const limit = Number(res.headers.get('X-Maria-Limit'))
    const remaining = res.headers.get('X-Maria-Remaining')
    if (res.status === 429) setUsage(prev => ({ limit: prev?.limit ?? limit, remaining: 0 }))
    else if (limit && remaining !== null) setUsage({ limit, remaining: Number(remaining) })
  }, [])

  return { usage, limitReached: usage?.remaining === 0, updateFrom }
}
