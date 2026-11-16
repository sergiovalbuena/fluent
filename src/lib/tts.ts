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

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French', es: 'Spanish', pt: 'Portuguese', de: 'German', it: 'Italian', ja: 'Japanese', en: 'English', zh: 'Mandarin Chinese',
}

// Words spelled the same in English: on their own, the model tends to read them the
// English way ("taxi", "restaurant"), so the instructions name a few as examples
const COGNATES: Record<string, string> = {
  fr: '"restaurant", "taxi", "orange", "important", "table", "animal", "concert"',
  es: '"hotel", "chocolate", "taxi", "animal", "normal", "doctor", "hospital"',
  pt: '"hotel", "animal", "taxi", "normal", "hospital"',
  de: '"Hotel", "Taxi", "Computer", "Hand", "Name", "Problem"',
  it: '"hotel", "taxi", "computer", "radio", "pizza"',
}

export function ttsInstructions(lang: string): string {
  const name = LANGUAGE_NAMES[lang]
  return [
    `Voice: ${ACCENTS[lang]}.`,
    lang !== 'en' && `Language: the text is ${name}. Pronounce every word with ${name} phonetics and stress, including words that also exist in English${COGNATES[lang] ? ` (for example ${COGNATES[lang]})` : ''}. Never use an English pronunciation.`,
    'Audience: someone learning the language — pronounce every word clearly and naturally, at a calm, slightly slower than conversational pace.',
    'Read exactly the given text, with no additions or commentary. Single words get a natural, neutral intonation.',
  ].filter(Boolean).join(' ')
}

export function ttsCachePath(lang: string, text: string): string {
  const hash = createHash('sha256').update(`${CACHE_VERSION}|${TTS_MODEL}|${TTS_VOICE}|${lang}|${text}`).digest('hex')
  return `${lang}/${hash.slice(0, 40)}.mp3`
}

/** Normalizes what we cache by: trims and collapses whitespace */
export const normalizeTtsText = (text: string) => text.replace(/\s+/g, ' ').trim()
