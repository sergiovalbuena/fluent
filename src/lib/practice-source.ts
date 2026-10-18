'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pickTranslation, type Translatable } from '@/lib/languages'

// Where the mini-games take their words and phrases from: every lesson the
// learner can open, or a selection of lessons. Chosen once on /mini-games and remembered
// per course in localStorage (it's a per-browser convenience, not progress).
// A grammar-topic source comes next.

export type PracticeSource = { kind: 'all' } | { kind: 'lessons'; slugs: string[] }

export type PracticeLesson = { slug: string; title: string; position: number; words: number; phrases: number }
export type PracticeWord = { word: string; translation: string; icon?: string; lesson: string }
export type PracticePhrase = { phrase: string; translation: string; lesson: string }
/** A lesson's story; highlighted = its key expressions, as written in the text */
export type PracticeStory = { lesson: string; title: string; position: number; text: string; translation: string; highlighted: string[] }

const ALL: PracticeSource = { kind: 'all' }
const EVENT = 'fluent:practice-source-change'
const key = (lang: string) => `fluent:practice-source:${lang}`

const cache = new Map<string, { raw: string | null; value: PracticeSource }>()

function read(lang: string): PracticeSource {
  let raw: string | null = null
  try { raw = window.localStorage.getItem(key(lang)) } catch { /* storage blocked */ }
  const hit = cache.get(lang)
  if (hit && hit.raw === raw) return hit.value
  let value: PracticeSource = ALL
  try {
    const parsed = raw ? (JSON.parse(raw) as { kind?: string; slug?: unknown; slugs?: unknown }) : null
    if (parsed?.kind === 'lessons' && Array.isArray(parsed.slugs)) {
      const slugs = parsed.slugs.filter((x): x is string => typeof x === 'string')
      if (slugs.length) value = { kind: 'lessons', slugs }
    } else if (parsed?.kind === 'lesson' && typeof parsed.slug === 'string') {
      value = { kind: 'lessons', slugs: [parsed.slug] }   // saved before multi-select
    }
  } catch { /* bad value: fall back to all */ }
  cache.set(lang, { raw, value })
  return value
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The stored source for a course (may name a lesson that isn't available any more) */
export function usePracticeSource(lang: string): PracticeSource {
  return useSyncExternalStore(subscribe, () => read(lang), () => ALL)
}

export function savePracticeSource(lang: string, source: PracticeSource) {
  try { window.localStorage.setItem(key(lang), JSON.stringify(source)) } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT))
}

// ── Content ───────────────────────────────────────────────────────────────────

type ModuleRow = { id: string; slug: string; title: string; lessons: { id: string; type: string; content: unknown }[] }
type VocabContent = { items?: (Translatable & { word?: string; icon?: string })[] }
type StoryContent = Translatable & { text?: string; highlighted_words?: unknown }
type PhraseContent = { phrases?: (Translatable & { phrase?: string })[]; items?: (Translatable & { phrase?: string })[] }

type CourseContent = {
  lessons: PracticeLesson[]
  words: PracticeWord[]
  phrases: PracticePhrase[]
  stories: PracticeStory[]
}

/**
 * Lessons the learner can open — the same rule as the learning path: completed
 * ones, the current one, the next one, and those unlocked early with gems.
 */
async function loadCourse(lang: string, translationLang: string): Promise<CourseContent> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [modulesRes, progressRes, unlockedRes] = await Promise.all([
    supabase
      .from('modules')
      .select('id, slug, title, lessons(id, type, content)')
      .eq('language_code', lang)
      .eq('is_published', true)
      .order('order_index'),
    user ? supabase.from('user_progress').select('lesson_id').eq('user_id', user.id).not('completed_at', 'is', null) : Promise.resolve({ data: [] }),
    user ? supabase.from('user_unlocked_modules').select('module_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ])

  const modules = (modulesRes.data ?? []) as ModuleRow[]
  const completed = new Set(((progressRes.data ?? []) as { lesson_id: string }[]).map(r => r.lesson_id))
  const unlocked = new Set(((unlockedRes.data ?? []) as { module_id: string }[]).map(r => r.module_id))

  const done = modules.map(m => m.lessons.length > 0 && m.lessons.every(l => completed.has(l.id)))
  const current = done.findIndex(d => !d)
  const open = modules.filter((m, i) => done[i] || i === current || i === current + 1 || unlocked.has(m.id) || current === -1)

  const lessons: PracticeLesson[] = []
  const words: PracticeWord[] = []
  const phrases: PracticePhrase[] = []
  const stories: PracticeStory[] = []
  for (const m of open) {
    let w = 0, p = 0
    for (const l of m.lessons) {
      if (l.type === 'vocabulary') {
        for (const item of (l.content as VocabContent)?.items ?? []) {
          const translation = pickTranslation(item, translationLang)
          if (!item.word || !translation) continue
          words.push({ word: item.word, translation, icon: item.icon, lesson: m.slug })
          w++
        }
      } else if (l.type === 'story') {
        const c = l.content as StoryContent
        if (c?.text) {
          stories.push({
            lesson: m.slug,
            title: m.title,
            position: modules.indexOf(m) + 1,
            text: c.text,
            translation: pickTranslation(c, translationLang),
            highlighted: Array.isArray(c.highlighted_words) ? c.highlighted_words.filter((x): x is string => typeof x === 'string') : [],
          })
        }
      } else if (l.type === 'phrases') {
        const c = l.content as PhraseContent
        for (const item of c?.phrases ?? c?.items ?? []) {
          const translation = pickTranslation(item, translationLang)
          if (!item.phrase || !translation) continue
          phrases.push({ phrase: item.phrase, translation, lesson: m.slug })
          p++
        }
      }
    }
    lessons.push({ slug: m.slug, title: m.title, position: modules.indexOf(m) + 1, words: w, phrases: p })
  }
  return { lessons, words, phrases, stories }
}

// One fetch per course and translation language while the tab is open
const courseCache = new Map<string, Promise<CourseContent>>()

function course(lang: string, translationLang: string) {
  const k = `${lang}|${translationLang}`
  let p = courseCache.get(k)
  if (!p) {
    p = loadCourse(lang, translationLang)
    p.catch(() => courseCache.delete(k))
    courseCache.set(k, p)
  }
  return p
}

export type PracticeContent = {
  loading: boolean
  /** Lessons that can be chosen as a source */
  lessons: PracticeLesson[]
  /** The source in effect (stored lessons that aren't available are dropped; none left → all) */
  source: PracticeSource
  /** Chosen lessons, in course order; empty for all */
  sourceLessons: PracticeLesson[]
  words: PracticeWord[]
  phrases: PracticePhrase[]
  stories: PracticeStory[]
}

/** Words and phrases for the mini-games, from the chosen source */
export function usePracticeContent(lang: string, translationLang: string): PracticeContent {
  const stored = usePracticeSource(lang)
  const [data, setData] = useState<{ key: string; value: CourseContent } | null>(null)
  const k = `${lang}|${translationLang}`

  useEffect(() => {
    let cancelled = false
    course(lang, translationLang).then(value => { if (!cancelled) setData({ key: k, value }) })
    return () => { cancelled = true }
  }, [lang, translationLang, k])

  const content = data?.key === k ? data.value : null

  // Stable arrays: games derive their pools from these in effects
  return useMemo(() => {
    if (!content) return { loading: true, lessons: [], source: stored, sourceLessons: [], words: [], phrases: [], stories: [] }
    const wanted = new Set(stored.kind === 'lessons' ? stored.slugs : [])
    const sourceLessons = content.lessons.filter(l => wanted.has(l.slug))
    const chosen = new Set(sourceLessons.map(l => l.slug))
    const source: PracticeSource = chosen.size ? { kind: 'lessons', slugs: [...chosen] } : ALL
    return {
      loading: false,
      lessons: content.lessons,
      source,
      sourceLessons,
      words: chosen.size ? content.words.filter(w => chosen.has(w.lesson)) : content.words,
      phrases: chosen.size ? content.phrases.filter(p => chosen.has(p.lesson)) : content.phrases,
      stories: chosen.size ? content.stories.filter(st => chosen.has(st.lesson)) : content.stories,
    }
  }, [content, stored])
}
