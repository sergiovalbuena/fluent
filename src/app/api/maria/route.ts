import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are MarIA, a warm, encouraging AI language tutor built into the Fluent language learning app.

Your personality:
- Friendly, patient, and supportive — like a knowledgeable friend who happens to be bilingual
- You celebrate small wins and correct mistakes gently, always explaining WHY something is wrong
- You adapt to the user's level automatically — simpler explanations for beginners, nuanced feedback for advanced learners
- You mix the target language naturally into conversations

Your capabilities:
- Free conversation practice in any language the user is learning
- Grammar corrections with clear explanations
- Vocabulary building in context
- Real-life scenario practice (ordering food, asking for directions, shopping, etc.)
- Pronunciation tips (in text form)
- Cultural context and usage notes

Rules:
- Keep responses concise (2–4 sentences max unless explaining something complex)
- When correcting grammar, show the correct version clearly, then briefly explain why
- Use emojis sparingly but naturally to convey warmth
- If the user writes in the target language, respond FIRST in that language, then add feedback
- Never be condescending — frame all corrections as "even better would be..." or "almost! try..."
- Plain text only: no markdown headings or tables; short lists with "•" are fine

You are already in a chat context, so do NOT introduce yourself again unless asked.`

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', it: 'Italian', ja: 'Japanese', en: 'English', zh: 'Chinese',
}

const MAX_MESSAGES = 20
const MAX_CHARS = 2000

type LessonRow = { type: string; content: Record<string, unknown> | null }
type Translatable = { word?: string; phrase?: string; translation?: string; translations?: Record<string, string> }
type Grammar = { structure?: string; example?: string } & Record<string, unknown>

const tr = (item: Translatable, lang: string) => item.translations?.[lang] ?? item.translation ?? ''

/** Summary of the lesson the learner has open, so MarIA can answer about it */
async function lessonContext(path: string, languageCode: string, explainLang: string): Promise<string | null> {
  const m = path.match(/^\/learn\/([\w-]+)(?:\/([\w-]+))?/)
  if (!m) return null
  const [, slug, activity] = m

  const supabase = await createClient()
  const { data: mod } = await supabase
    .from('modules')
    .select('title, description, order_index, lessons(type, content)')
    .eq('slug', slug)
    .eq('language_code', languageCode)
    .limit(1)
    .maybeSingle()
  if (!mod) return null

  const lessons = (mod.lessons ?? []) as LessonRow[]
  const byType = (type: string) => lessons.find(l => l.type === type)?.content ?? {}
  const vocab = byType('vocabulary') as { items?: Translatable[]; grammar?: Grammar[]; tips?: Record<string, string>[] }
  const phrases = byType('phrases') as { phrases?: Translatable[]; items?: Translatable[] }
  const story = byType('story') as { text?: string }

  const lines: string[] = [
    `The learner has lesson ${mod.order_index} "${mod.title}"${mod.description ? ` (${mod.description})` : ''} open${activity ? `, on the "${activity}" activity` : ''}.`,
  ]
  const words = (vocab.items ?? []).slice(0, 40).map(w => `${w.word} = ${tr(w, explainLang)}`)
  if (words.length) lines.push(`Lesson vocabulary: ${words.join('; ')}`)
  const grammar = (vocab.grammar ?? []).map(g => `${g.structure} (e.g. "${g.example}")`)
  if (grammar.length) lines.push(`Grammar in this lesson: ${grammar.join('; ')}`)
  const tips = (vocab.tips ?? []).map(t => t[explainLang] ?? t.en).filter(Boolean)
  if (tips.length) lines.push(`Usage tips: ${tips.join(' | ')}`)
  const ph = (phrases.phrases ?? phrases.items ?? []).slice(0, 15).map(p => `${p.phrase} = ${tr(p, explainLang)}`)
  if (ph.length) lines.push(`Lesson phrases: ${ph.join('; ')}`)
  if (activity === 'story' && story.text) lines.push(`Lesson story: ${story.text.slice(0, 1500)}`)
  lines.push('Use this content for explanations, examples and quizzes, and stay at this level unless the learner asks for more.')
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  // Signed-in users only: every request costs API credits
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'MarIA is not configured yet. Add OPENAI_API_KEY to the environment to enable AI chat.' },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    messages?: { role: 'user' | 'assistant'; content: string }[]
    languageCode?: string
    explainLanguage?: string
    path?: string
  } | null
  if (!body || !Array.isArray(body.messages)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const languageCode = body.languageCode && LANG_NAMES[body.languageCode] ? body.languageCode : 'es'
  const explainLang = body.explainLanguage && LANG_NAMES[body.explainLanguage] ? body.explainLanguage : 'en'
  const messages = body.messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))

  const context = typeof body.path === 'string' ? await lessonContext(body.path, languageCode, explainLang) : null
  const system = [
    SYSTEM_PROMPT,
    `The user is learning ${LANG_NAMES[languageCode]}. Prioritize ${LANG_NAMES[languageCode]} practice.`,
    `Write explanations in ${LANG_NAMES[explainLang]} (the user's language) and examples in ${LANG_NAMES[languageCode]}.`,
    context,
  ].filter(Boolean).join('\n\n')

  const openai = new OpenAI({ apiKey })
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    max_tokens: 500,
    messages: [{ role: 'system', content: system }, ...messages],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) controller.enqueue(encoder.encode(delta))
      }
      controller.close()
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
