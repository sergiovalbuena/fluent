// Pronunciation practice: say a word or phrase, Azure Pronunciation Assessment
// scores it (see src/app/api/pronunciation/route.ts).
//
// On for the course languages listed in NEXT_PUBLIC_SPEECH_LANGUAGES ("fr", or
// "fr,en"…), set together with AZURE_SPEECH_KEY and AZURE_SPEECH_ENDPOINT (or
// AZURE_SPEECH_REGION). Unset,
// the feature is hidden and the star rules stay as they were.

const enabled = (process.env.NEXT_PUBLIC_SPEECH_LANGUAGES ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export function speechAvailable(languageCode: string): boolean {
  return enabled.includes(languageCode)
}

/** Overall score (0–100) that counts as said well */
export const SPEECH_PASS_SCORE = 80

/** Longest recording, in seconds: enough for a long phrase */
export const SPEECH_MAX_SECONDS = 10

/** Azure locale for each course language */
export const SPEECH_LOCALES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-MX',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ja: 'ja-JP',
}

export type SpokenWord = {
  word: string
  /** 0–100 */
  score: number
  /** None, Mispronunciation, Omission (not said), Insertion (extra word) */
  error: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | string
}

export type SpeechResult =
  | { status: 'ok'; score: number; accuracy: number; fluency: number; completeness: number; heard: string; words: SpokenWord[] }
  | { status: 'not_heard' }

/** Errors the route answers with, besides a SpeechResult */
export type SpeechError = 'not_configured' | 'limit' | 'unauthenticated' | 'signup_required' | 'bad_request' | 'failed'
