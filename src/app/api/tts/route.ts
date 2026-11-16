import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'
import {
  TTS_MAX_CHARS, TTS_MODEL, TTS_VOICE, isTtsLanguage, normalizeTtsText, ttsCachePath, ttsInstructions,
} from '@/lib/tts'

export const dynamic = 'force-dynamic'

const BUCKET = 'tts'
/**
 * New clips per user and UTC day. The course audio is pregenerated, so a learner
 * only generates what the script doesn't cover (answers, verb forms, grammar).
 */
const DAILY_LIMIT = 80

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

// GET /api/tts?lang=fr&text=bonjour → mp3 (redirects to the cached file when it exists)
export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang') ?? ''
  const text = normalizeTtsText(req.nextUrl.searchParams.get('text') ?? '')
  if (!isTtsLanguage(lang) || !text || text.length > TTS_MAX_CHARS) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const path = ttsCachePath(lang, text)
  const cached = await fetch(publicUrl(path), { method: 'HEAD', cache: 'no-store' }).catch(() => null)
  if (cached?.ok) {
    return NextResponse.redirect(publicUrl(path), { status: 302, headers: { 'Cache-Control': 'private, max-age=86400' } })
  }

  // Cached clips are public (the marketing pages play them); generating a new
  // one costs API credits, so that's for signed-in users only
  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // Guests play the pregenerated audio only: new clips cost credits
  if (user.is_anonymous) return NextResponse.json({ error: 'signup_required' }, { status: 403 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  // Counted before calling OpenAI. If the counter fails, refuse: the caller falls
  // back to the browser's voice, and one account can't run up the bill or fill the
  // public cache with arbitrary text.
  const { data: left, error: usageError } = await supabase.rpc('use_tts_generation', { p_limit: DAILY_LIMIT })
  if (usageError) {
    console.error('[tts] use_tts_generation failed:', usageError.message)
    return NextResponse.json({ error: 'failed' }, { status: 503 })
  }
  if (left === -1) return NextResponse.json({ error: 'limit' }, { status: 429 })

  let audio: ArrayBuffer
  try {
    const openai = new OpenAI({ apiKey })
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      instructions: ttsInstructions(lang),
      response_format: 'mp3',
    })
    audio = await speech.arrayBuffer()
  } catch (err) {
    console.error('[tts] generation failed', err)
    return NextResponse.json({ error: 'generation_failed' }, { status: 502 })
  }

  // Cache it for everyone (needs the service role key; without it audio still plays, uncached)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
    const { error } = await admin.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000' })
    if (error) console.error('[tts] cache upload failed', error.message)
  }

  return new NextResponse(audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' },
  })
}
