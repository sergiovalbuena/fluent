import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  TTS_MAX_CHARS, TTS_MODEL, TTS_VOICE, isTtsLanguage, normalizeTtsText, ttsCachePath, ttsInstructions,
} from '@/lib/tts'

export const dynamic = 'force-dynamic'

const BUCKET = 'tts'

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

// GET /api/tts?lang=fr&text=bonjour → mp3 (redirects to the cached file when it exists)
export async function GET(req: NextRequest) {
  // Signed-in users only: generating audio costs API credits
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

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
