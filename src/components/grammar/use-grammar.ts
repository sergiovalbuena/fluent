'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { createClient } from '@/lib/supabase/client'
import { explanationLanguage, loadGrammarIndex, type XpMultipliers, type ExplanationLanguage, type GrammarIndex, type GrammarProgress, type ModuleProgress } from '@/lib/grammar'
import { loadProgress, saveModuleProgress } from '@/lib/grammar-progress'
import { getXpMultipliers } from '@/lib/grammar-rewards'

/** The signed-in user and the language of the explanations they read (null until known) */
export function useGrammarUser(): { userId: string | null | undefined; expl: ExplanationLanguage | null } {
  const { translationLang } = useActiveLanguage()
  // undefined: not known yet
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
  }, [])
  return { userId, expl: userId === undefined ? null : explanationLanguage(translationLang, userId) }
}

/** The course's grammar index and the user's progress */
export function useGrammarIndex() {
  const { languageCode, translationLang } = useActiveLanguage()
  const { userId, expl } = useGrammarUser()
  // undefined: loading · null: no grammar for this course
  const [index, setIndex] = useState<GrammarIndex | null | undefined>(undefined)
  const [progress, setProgress] = useState<GrammarProgress>({})
  // Progress loaded: writes before that would be overwritten
  const [ready, setReady] = useState(false)
  const progressRef = useRef<GrammarProgress>({})

  useEffect(() => {
    if (!expl) return
    let cancelled = false
    loadGrammarIndex(languageCode, expl).then(data => { if (!cancelled) setIndex(data) })
    return () => { cancelled = true }
  }, [languageCode, expl])

  useEffect(() => {
    if (userId === undefined) return
    let cancelled = false
    const load = userId ? loadProgress(createClient(), languageCode) : Promise.resolve({})
    load.then(p => {
      if (cancelled) return
      progressRef.current = p
      setProgress(p)
      setReady(true)
    })
    return () => { cancelled = true }
  }, [languageCode, userId])

  const update = useCallback((slug: string, change: (p: ModuleProgress) => ModuleProgress) => {
    const next = saveModuleProgress(createClient(), userId ?? null, languageCode, progressRef.current, slug, change)
    progressRef.current = next
    setProgress(next)
  }, [languageCode, userId])

  /** A score already saved by the exercise: just reflect it */
  const applyScore = useCallback((slug: string, exId: string, pct: number) => {
    const p = progressRef.current[slug] ?? { best: {}, checklist: [], visited: true }
    const next = { ...progressRef.current, [slug]: { ...p, best: { ...p.best, [exId]: Math.max(p.best[exId] ?? 0, pct) } } }
    progressRef.current = next
    setProgress(next)
  }, [])

  return { index, progress, ready, update, applyScore, languageCode, translationLang, expl }
}

/** The XP multipliers that apply right now (streak, XP boost), to show them before playing */
export function useXpMultipliers(): XpMultipliers | null {
  const [m, setM] = useState<XpMultipliers | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) getXpMultipliers(supabase, data.session.user.id).then(setM)
    })
  }, [])
  return m
}
