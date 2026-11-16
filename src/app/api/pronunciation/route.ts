import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'
import { SPEECH_LOCALES, SPEECH_MAX_SECONDS, speechAvailable, type SpeechError, type SpeechResult, type SpokenWord } from '@/lib/speech'

export const dynamic = 'force-dynamic'

// Scores a recording against the text the user had to say, with Azure
// Pronunciation Assessment (short-audio REST API). The key never leaves the
// server, and every attempt counts against a daily limit per user.

/** Attempts per user and UTC day (about 4 s of audio each, paid per second) */
const DAILY_LIMIT = 60
const MAX_TEXT = 200
// 16 kHz × 16-bit mono, plus the WAV header and some slack
const MAX_BYTES = SPEECH_MAX_SECONDS * 16000 * 2 + 4096

type AzureScores = { AccuracyScore?: number; FluencyScore?: number; CompletenessScore?: number; PronScore?: number; ErrorType?: string }
type AzureWord = AzureScores & { Word: string; PronunciationAssessment?: AzureScores }
type AzureNBest = AzureScores & { Display?: string; Lexical?: string; Words?: AzureWord[]; PronunciationAssessment?: AzureScores }
type AzureResponse = { RecognitionStatus: string; NBest?: AzureNBest[] }

function fail(error: SpeechError, status: number) {
  return NextResponse.json({ error }, { status })
}

export async function POST(req: NextRequest) {
  // The resource's own endpoint (https://<name>.cognitiveservices.azure.com) or, failing
  // that, the regional one built from AZURE_SPEECH_REGION (e.g. "eastus")
  const key = process.env.AZURE_SPEECH_KEY
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.replace(/\/+$/, '')
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || (!endpoint && !region)) return fail('not_configured', 503)

  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (!user) return fail('unauthenticated', 401)

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  const text = form?.get('text')
  const languageCode = form?.get('languageCode')
  if (!(audio instanceof Blob) || typeof text !== 'string' || typeof languageCode !== 'string') return fail('bad_request', 400)
  const reference = text.trim().slice(0, MAX_TEXT)
  const locale = SPEECH_LOCALES[languageCode]
  if (!reference || !locale || !speechAvailable(languageCode)) return fail('bad_request', 400)
  if (audio.size === 0 || audio.size > MAX_BYTES) return fail('bad_request', 400)

  // Counted before calling Azure. If the counter fails, refuse: Azure has no
  // spend limit of its own to fall back on.
  const { data: left, error: usageError } = await supabase.rpc('use_speech_attempt', { p_limit: DAILY_LIMIT })
  if (usageError) {
    console.error('[pronunciation] use_speech_attempt failed:', usageError.message)
    return fail('failed', 503)
  }
  if (left === -1) return fail('limit', 429)

  const assessment = Buffer.from(JSON.stringify({
    ReferenceText: reference,
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
  })).toString('base64')

  const base = endpoint
    ? `${endpoint}/stt/speech/recognition/conversation/cognitiveservices/v1`
    : `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
  const url = `${base}?language=${locale}&format=detailed`
  let data: AzureResponse
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': assessment,
        Accept: 'application/json',
      },
      body: Buffer.from(await audio.arrayBuffer()),
    })
    if (!res.ok) {
      console.error('[pronunciation] Azure answered', res.status, await res.text().catch(() => ''))
      return fail('failed', 502)
    }
    data = await res.json() as AzureResponse
  } catch (err) {
    console.error('[pronunciation] Azure request failed:', err)
    return fail('failed', 502)
  }

  const best = data.NBest?.[0]
  if (data.RecognitionStatus !== 'Success' || !best) {
    return NextResponse.json({ status: 'not_heard' } satisfies SpeechResult)
  }

  // The scores sit on the result itself or under PronunciationAssessment, depending on the API version
  const scores = (x: AzureScores & { PronunciationAssessment?: AzureScores }) => ({ ...x, ...x.PronunciationAssessment })
  const overall = scores(best)
  const round = (n: number | undefined) => Math.round(n ?? 0)
  const words: SpokenWord[] = (best.Words ?? []).map(w => {
    const s = scores(w)
    return { word: w.Word, score: round(s.AccuracyScore), error: s.ErrorType ?? 'None' }
  })

  return NextResponse.json({
    status: 'ok',
    score: round(overall.PronScore ?? overall.AccuracyScore),
    accuracy: round(overall.AccuracyScore),
    fluency: round(overall.FluencyScore),
    completeness: round(overall.CompletenessScore),
    heard: best.Display ?? best.Lexical ?? '',
    words,
  } satisfies SpeechResult)
}
