import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

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
- If the user writes in the target language, respond FIRST in that language, then add English feedback
- Never be condescending — frame all corrections as "even better would be..." or "almost! try..."
- If unsure what language to use, ask the user what they're practicing

Start conversations warmly. You are already in a chat context, so do NOT introduce yourself again unless asked.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'MarIA is not configured yet. Add your OPENAI_API_KEY to .env.local to enable AI chat.' },
      { status: 503 },
    )
  }

  const openai = new OpenAI({ apiKey })

  const body = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    languageCode?: string
  }

  const { messages, languageCode = 'es' } = body

  const LANG_NAMES: Record<string, string> = {
    es: 'Spanish', fr: 'French', pt: 'Portuguese',
    de: 'German', it: 'Italian', ja: 'Japanese',
  }
  const langName = LANG_NAMES[languageCode] ?? 'Spanish'

  const systemWithLang = `${SYSTEM_PROMPT}\n\nThe user is currently learning ${langName}. Prioritize ${langName} practice.`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    max_tokens: 400,
    messages: [
      { role: 'system', content: systemWithLang },
      ...messages,
    ],
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          controller.enqueue(encoder.encode(delta))
        }
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
