// Single source of truth for language metadata, speech and article handling.

export type LanguageInfo = {
  code: string
  name: string
  nativeName: string
  flag: string
  speechLocale: string
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'es', name: 'Spanish',    nativeName: 'Español',   flag: '🇪🇸', speechLocale: 'es-ES' },
  { code: 'fr', name: 'French',     nativeName: 'Français',  flag: '🇫🇷', speechLocale: 'fr-FR' },
  { code: 'en', name: 'English',    nativeName: 'English',   flag: '🇺🇸', speechLocale: 'en-US' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', speechLocale: 'pt-BR' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',   flag: '🇩🇪', speechLocale: 'de-DE' },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano',  flag: '🇮🇹', speechLocale: 'it-IT' },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',     flag: '🇯🇵', speechLocale: 'ja-JP' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',       flag: '🇨🇳', speechLocale: 'zh-CN' },
]

export const DEFAULT_LANGUAGE = 'es'

/** Languages that currently have published course content */
export const COURSE_LANGUAGES = ['es', 'fr', 'en', 'pt', 'de', 'it', 'ja']

export function getLanguage(code: string): LanguageInfo {
  return (
    LANGUAGES.find(l => l.code === code) ??
    { code, name: code.toUpperCase(), nativeName: code.toUpperCase(), flag: '🌐', speechLocale: code }
  )
}

// ── Greetings ─────────────────────────────────────────────────────────────────
// Time-of-day greeting in the language being learned (dashboard hero)

const GREETINGS: Record<string, [morning: string, afternoon: string, evening: string]> = {
  es: ['Buenos días', 'Buenas tardes', 'Buenas noches'],
  fr: ['Bonjour', 'Bonjour', 'Bonsoir'],  // 'Bon après-midi' is a farewell, not a greeting
  en: ['Good morning', 'Good afternoon', 'Good evening'],
  pt: ['Bom dia', 'Boa tarde', 'Boa noite'],
  de: ['Guten Morgen', 'Guten Tag', 'Guten Abend'],
  it: ['Buongiorno', 'Buon pomeriggio', 'Buonasera'],
  ja: ['おはようございます', 'こんにちは', 'こんばんは'],
  zh: ['早上好', '下午好', '晚上好'],
}

export function getGreeting(langCode: string, hour: number): string | null {
  const g = GREETINGS[langCode]
  if (!g) return null
  return hour < 12 ? g[0] : hour < 18 ? g[1] : g[2]
}

// ── Speech ────────────────────────────────────────────────────────────────────
// Native-sounding AI voice from /api/tts (cached server-side); falls back to the
// browser's built-in voice if that isn't available (signed out, offline, not configured).

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && ('Audio' in window || 'speechSynthesis' in window)
}

export type SpeakOptions = {
  /** Playback speed, 1 = natural (the AI voice already speaks slowly and clearly) */
  rate?: number
  onStart?: () => void
  onEnd?: () => void
}

export type SpeechHandle = { pause: () => void; resume: () => void; stop: () => void }

const NOOP_HANDLE: SpeechHandle = { pause() {}, resume() {}, stop() {} }

let currentAudio: HTMLAudioElement | null = null

export function stopSpeaking() {
  if (typeof window === 'undefined') return
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.removeAttribute('src')
    currentAudio = null
  }
  window.speechSynthesis?.cancel()
}

export function ttsUrl(text: string, langCode: string): string {
  return `/api/tts?lang=${encodeURIComponent(langCode)}&text=${encodeURIComponent(text.replace(/\s+/g, ' ').trim())}`
}

function browserSpeak(text: string, langCode: string, options: SpeakOptions): SpeechHandle {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { options.onEnd?.(); return NOOP_HANDLE }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = getLanguage(langCode).speechLocale
  u.rate = 0.85 * (options.rate ?? 1)
  u.onstart = () => options.onStart?.()
  u.onend = () => options.onEnd?.()
  u.onerror = () => options.onEnd?.()
  window.speechSynthesis.speak(u)
  return {
    pause: () => window.speechSynthesis.pause(),
    resume: () => window.speechSynthesis.resume(),
    stop: () => window.speechSynthesis.cancel(),
  }
}

export function speak(text: string, langCode: string, options: SpeakOptions = {}): SpeechHandle {
  if (typeof window === 'undefined' || !text.trim()) return NOOP_HANDLE
  stopSpeaking()

  const audio = new Audio(ttsUrl(text, langCode))
  audio.playbackRate = options.rate ?? 1
  currentAudio = audio
  let fallback: SpeechHandle | null = null
  let started = false

  const useFallback = () => {
    if (currentAudio !== audio || fallback || started) return   // superseded, or already playing
    currentAudio = null
    fallback = browserSpeak(text, langCode, options)
  }

  audio.onplaying = () => { started = true; options.onStart?.() }
  audio.onended = () => { if (currentAudio === audio) currentAudio = null; options.onEnd?.() }
  audio.onerror = useFallback
  audio.play().catch(useFallback)

  return {
    pause: () => (fallback ? fallback.pause() : audio.pause()),
    resume: () => (fallback ? fallback.resume() : void audio.play().catch(() => {})),
    stop: () => {
      if (fallback) fallback.stop()
      else { audio.pause(); if (currentAudio === audio) currentAudio = null }
    },
  }
}

// ── Articles ──────────────────────────────────────────────────────────────────
// Elided forms (l', un') attach to the noun without a space.

const ARTICLES: Record<string, RegExp> = {
  es: /^(el|la|los|las|un|una|unos|unas)\s+/i,
  fr: /^(?:(le|la|les|un|une|des|du|de la)\s+|(l['’]))/i,
  pt: /^(o|a|os|as|um|uma|uns|umas)\s+/i,
  it: /^(?:(il|lo|la|i|gli|le|un|uno|una)\s+|(l['’]|un['’]))/i,
  de: /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/i,
  en: /^(the|a|an)\s+/i,
}

export function splitArticle(word: string, langCode: string): { article: string; main: string } | null {
  const re = ARTICLES[langCode]
  if (!re) return null
  const m = word.match(re)
  if (!m) return null
  return { article: m[0].trimEnd(), main: word.slice(m[0].length) }
}

/** Lowercased word without its leading article — used for typing and spelling games. */
export function stripArticle(word: string, langCode: string): string {
  return (splitArticle(word, langCode)?.main ?? word).toLowerCase().trim()
}

// ── Translations ──────────────────────────────────────────────────────────────
// Content items carry `translation` (legacy, English) and optionally
// `translations: { es: '...', en: '...' }`. Pick the user's preferred one.

export type Translatable = { translation?: string; translations?: Record<string, string> }

export function pickTranslation(item: Translatable, translationLang: string): string {
  return item.translations?.[translationLang] ?? item.translation ?? item.translations?.en ?? ''
}

// Q&A questions carry an optional per-language override of their text:
// `translations: { es: { question, options?, correct?, explanation? } }`.
// Options/correct are only overridden when they are in the translation language
// (options in the course language stay as they are).

export type RawQuestion = {
  question: string
  options: string[]
  correct: string | number
  explanation?: string
  translations?: Record<string, Partial<Pick<RawQuestion, 'question' | 'options' | 'correct' | 'explanation'>>>
}

export function localizeQuestion(q: RawQuestion, translationLang: string) {
  const t = q.translations?.[translationLang] ?? {}
  const options = t.options ?? q.options
  const correct = t.correct ?? q.correct
  return {
    question: t.question ?? q.question,
    options,
    correct: typeof correct === 'number' ? correct : options.indexOf(correct),
    explanation: t.explanation ?? q.explanation,
  }
}
