#!/usr/bin/env -S npx tsx
// Pre-generates the AI pronunciation audio for a course, so every word,
// phrase, grammar example and story plays instantly the first time.
//
// Usage (reads keys from .env.local):
//   npx tsx scripts/pregenerate-tts.mts en --dry-run   # count clips and estimate cost
//   npx tsx scripts/pregenerate-tts.mts en             # generate and upload what's missing
//
// Uses the same model, voice, instructions and cache paths as /api/tts, so the
// app finds these files in the `tts` bucket. Already cached clips are skipped,
// which makes the script safe to re-run after an interruption.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import {
  TTS_MAX_CHARS, TTS_MODEL, TTS_VOICE, isTtsLanguage, normalizeTtsText, ttsCachePath, ttsInstructions,
} from '../src/lib/tts'

// Minimal .env.local loader (no extra dependency)
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const lang = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const CONCURRENCY = 4
// gpt-4o-mini-tts is billed mainly by audio length: roughly $0.015 per minute.
// Clear, slow speech is about 12 characters per second.
const USD_PER_MINUTE = 0.015
const CHARS_PER_SECOND = 12

if (!lang || !isTtsLanguage(lang)) {
  console.error('Usage: npx tsx scripts/pregenerate-tts.mts <language_code> [--dry-run]')
  process.exit(1)
}

type Item = { word?: string; phrase?: string }
type Lesson = {
  vocabulary?: Item[]
  phrases?: Item[]
  grammar?: { example?: string }[]
  story?: { text?: string }
}

// Every text the app speaks: vocabulary (also used by Listening and Dictation),
// phrases, grammar examples and the full story
const dir = join('content', lang)
const texts = new Set<string>()
for (const file of readdirSync(dir).filter(f => /^(lecon|lesson)-\d+\.json$/.test(f)).sort()) {
  const d = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Lesson
  for (const v of d.vocabulary ?? []) if (v.word) texts.add(normalizeTtsText(v.word))
  for (const p of d.phrases ?? []) if (p.phrase) texts.add(normalizeTtsText(p.phrase))
  for (const g of d.grammar ?? []) if (g.example) texts.add(normalizeTtsText(g.example))
  if (d.story?.text) texts.add(normalizeTtsText(d.story.text))
}

const all = [...texts].filter(t => t.length > 0 && t.length <= TTS_MAX_CHARS)
const chars = all.reduce((s, t) => s + t.length, 0)
const minutes = chars / CHARS_PER_SECOND / 60
console.log(`${all.length} clips · ${chars.toLocaleString()} characters · ~${minutes.toFixed(0)} min of audio · ~$${(minutes * USD_PER_MINUTE).toFixed(2)} if none are cached`)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publicUrl = (path: string) => `${url}/storage/v1/object/public/tts/${path}`
const isCached = async (path: string) => (await fetch(publicUrl(path), { method: 'HEAD' })).ok

if (dryRun) {
  // Check the cache in parallel batches (thousands of sequential requests are slow)
  let cached = 0
  for (let i = 0; i < all.length; i += 25) {
    const batch = await Promise.all(all.slice(i, i + 25).map(t => isCached(ttsCachePath(lang, t)).catch(() => false)))
    cached += batch.filter(Boolean).length
  }
  console.log(`${cached} already cached · ${all.length - cached} to generate`)
  process.exit(0)
}

const apiKey = process.env.OPENAI_API_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!apiKey || !serviceKey || !url) {
  console.error('Missing OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

const openai = new OpenAI({ apiKey })
const storage = createClient(url, serviceKey, { auth: { persistSession: false } }).storage.from('tts')

let done = 0, skipped = 0, failed = 0
const queue = [...all]

async function worker() {
  for (let text = queue.shift(); text !== undefined; text = queue.shift()) {
    const path = ttsCachePath(lang, text)
    try {
      if (await isCached(path)) { skipped++; continue }
      const speech = await openai.audio.speech.create({
        model: TTS_MODEL, voice: TTS_VOICE, input: text, instructions: ttsInstructions(lang), response_format: 'mp3',
      })
      const { error } = await storage.upload(path, await speech.arrayBuffer(), { contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000' })
      if (error) throw new Error(error.message)
      done++
    } catch (e) {
      failed++
      console.error(`✗ ${text.slice(0, 50)}: ${(e as Error).message}`)
    }
    const total = done + skipped + failed
    if (total % 50 === 0) console.log(`… ${total}/${all.length}`)
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
console.log(`\nGenerated ${done} · already cached ${skipped} · failed ${failed}`)
process.exit(failed > 0 ? 1 : 0)
