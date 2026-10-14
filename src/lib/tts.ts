import { createHash } from 'node:crypto'

// Server-side text-to-speech: native-sounding pronunciation with OpenAI's TTS,
// cached in the public Supabase Storage bucket `tts` (each text is generated once).

export const TTS_MODEL = 'gpt-4o-mini-tts'
export const TTS_VOICE = 'coral'
export const TTS_MAX_CHARS = 1500
// Bump to regenerate every cached clip (e.g. after changing voice or instructions)
const CACHE_VERSION = 'v1'

const ACCENTS: Record<string, string> = {
  fr: 'a native speaker of French from France, with standard Parisian pronunciation and natural liaisons',
  es: 'a native speaker of Spanish with a neutral Latin American accent',
  pt: 'a native speaker of Brazilian Portuguese',
  de: 'a native speaker of standard German from Germany',
  it: 'a native speaker of standard Italian from Italy',
  ja: 'a native speaker of standard Tokyo Japanese',
  en: 'a native speaker of American English',
  zh: 'a native speaker of Mandarin Chinese (Putonghua)',
}

export const isTtsLanguage = (lang: string) => lang in ACCENTS

export function ttsInstructions(lang: string): string {
  return [
    `Voice: ${ACCENTS[lang]}.`,
    'Audience: someone learning the language — pronounce every word clearly and naturally, at a calm, slightly slower than conversational pace.',
    'Read exactly the given text, with no additions or commentary. Single words get a natural, neutral intonation.',
  ].join(' ')
}

export function ttsCachePath(lang: string, text: string): string {
  const hash = createHash('sha256').update(`${CACHE_VERSION}|${TTS_MODEL}|${TTS_VOICE}|${lang}|${text}`).digest('hex')
  return `${lang}/${hash.slice(0, 40)}.mp3`
}

/** Normalizes what we cache by: trims and collapses whitespace */
export const normalizeTtsText = (text: string) => text.replace(/\s+/g, ' ').trim()
