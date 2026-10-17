'use client'

import { useSyncExternalStore } from 'react'

// The title-hint setting (tooltips on lesson section titles) is a per-browser
// preference: hints are desktop-only, so it lives in localStorage, not the DB.

export type TitleHintSettings = { enabled: boolean; untilLesson: number }

export const DEFAULT_TITLE_HINTS: TitleHintSettings = { enabled: true, untilLesson: 3 }

const KEY = 'fluent:title-hints'
const EVENT = 'fluent:title-hints-change'

let cachedRaw: string | null = null
let cached: TitleHintSettings = DEFAULT_TITLE_HINTS

function read(): TitleHintSettings {
  let raw: string | null = null
  try { raw = window.localStorage.getItem(KEY) } catch { /* storage blocked */ }
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<TitleHintSettings>) : {}
    cached = {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_TITLE_HINTS.enabled,
      untilLesson: typeof parsed.untilLesson === 'number' ? parsed.untilLesson : DEFAULT_TITLE_HINTS.untilLesson,
    }
  } catch {
    cached = DEFAULT_TITLE_HINTS
  }
  return cached
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useTitleHintSettings(): TitleHintSettings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_TITLE_HINTS)
}

export function saveTitleHintSettings(settings: TitleHintSettings) {
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT))
}
