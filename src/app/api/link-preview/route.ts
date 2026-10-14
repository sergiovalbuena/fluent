import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectPlatform, parseUrl, youtubeId } from '@/lib/study-links'

export const dynamic = 'force-dynamic'

type Preview = {
  url: string
  platform: ReturnType<typeof detectPlatform>
  title: string | null
  author: string | null
  thumbnail_url: string | null
}

type OEmbed = {
  title?: string
  author_name?: string
  thumbnail_url?: string
  author_unique_id?: string
  embed_product_id?: string
}

const clip = (s: string | undefined, max: number) => (s ? s.slice(0, max) : null)
const httpsOrNull = (s: string | undefined) => (s && s.startsWith('https://') ? s.slice(0, 2048) : null)

// Only the platforms' public oEmbed endpoints are ever fetched — never the user's URL itself
async function oembed(endpoint: string): Promise<OEmbed | null> {
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } })
    if (!res.ok) return null
    return (await res.json()) as OEmbed
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { url?: string } | null
  const url = parseUrl(body?.url ?? '')
  if (!url) return NextResponse.json({ error: 'invalid_url' }, { status: 400 })

  const platform = detectPlatform(url)
  const preview: Preview = { url: url.toString(), platform, title: null, author: null, thumbnail_url: null }
  const encoded = encodeURIComponent(url.toString())

  if (platform === 'youtube') {
    const data = await oembed(`https://www.youtube.com/oembed?format=json&url=${encoded}`)
    const id = youtubeId(url)
    preview.title = clip(data?.title, 300)
    preview.author = clip(data?.author_name, 200)
    preview.thumbnail_url = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : httpsOrNull(data?.thumbnail_url)
  } else if (platform === 'tiktok') {
    const data = await oembed(`https://www.tiktok.com/oembed?url=${encoded}`)
    preview.title = clip(data?.title, 300)
    preview.author = clip(data?.author_name, 200)
    preview.thumbnail_url = httpsOrNull(data?.thumbnail_url)
    // Short links (vm.tiktok.com/…) carry no video id; store the canonical URL so it can be embedded
    if (data?.author_unique_id && data.embed_product_id && /^\d+$/.test(data.embed_product_id)) {
      preview.url = `https://www.tiktok.com/@${encodeURIComponent(data.author_unique_id)}/video/${data.embed_product_id}`
    }
  }
  // Instagram's oEmbed needs an app token; the user can type a title instead

  return NextResponse.json(preview)
}
