// Study links: videos and posts users save as study material.
// Platform detection and embed URLs are computed from the URL alone.

export type LinkPlatform = 'youtube' | 'tiktok' | 'instagram' | 'other'
export type LinkCategory = 'vocabulary' | 'pronunciation' | 'grammar' | 'tip' | 'other'

export const LINK_CATEGORIES: LinkCategory[] = ['vocabulary', 'pronunciation', 'grammar', 'tip', 'other']

export type StudyLink = {
  id: string
  language_code: string
  url: string
  platform: LinkPlatform
  title: string | null
  author: string | null
  thumbnail_url: string | null
  category: LinkCategory
  note: string | null
  created_at: string
}

export const PLATFORM_META: Record<LinkPlatform, { label: string; color: string; emoji: string }> = {
  youtube:   { label: 'YouTube',   color: '#ff0033', emoji: '▶️' },
  tiktok:    { label: 'TikTok',    color: '#111111', emoji: '🎵' },
  instagram: { label: 'Instagram', color: '#d62976', emoji: '📸' },
  other:     { label: 'Web',       color: '#64748b', emoji: '🔗' },
}

/** Parses user input into a normalized https URL, or null if it isn't one */
export function parseUrl(input: string): URL | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname.includes('.')) return null
    url.protocol = 'https:'
    return url
  } catch {
    return null
  }
}

const host = (url: URL) => url.hostname.replace(/^(www\.|m\.)/, '')

export function detectPlatform(url: URL): LinkPlatform {
  const h = host(url)
  if (h === 'youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com') return 'youtube'
  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return 'tiktok'
  if (h === 'instagram.com') return 'instagram'
  return 'other'
}

export function youtubeId(url: URL): string | null {
  const h = host(url)
  let id: string | null = null
  if (h === 'youtu.be') id = url.pathname.slice(1).split('/')[0]
  else if (url.searchParams.get('v')) id = url.searchParams.get('v')
  else {
    const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)
    if (m) id = m[1]
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null
}

export function tiktokId(url: URL): string | null {
  const m = url.pathname.match(/\/video\/(\d{6,25})/)
  return m ? m[1] : null
}

export function instagramCode(url: URL): { kind: string; code: string } | null {
  const m = url.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]{5,40})/)
  return m ? { kind: m[1] === 'reels' ? 'reel' : m[1], code: m[2] } : null
}

/** Iframe URL to play the link inside the app, when the platform allows it */
export function embedUrl(link: Pick<StudyLink, 'url' | 'platform'>, videoId?: string | null): string | null {
  const url = parseUrl(link.url)
  if (!url) return null
  if (link.platform === 'youtube') {
    const id = youtubeId(url)
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null
  }
  if (link.platform === 'tiktok') {
    const id = videoId ?? tiktokId(url)
    return id ? `https://www.tiktok.com/embed/v2/${id}` : null
  }
  if (link.platform === 'instagram') {
    const ig = instagramCode(url)
    return ig ? `https://www.instagram.com/${ig.kind}/${ig.code}/embed/` : null
  }
  return null
}

/** Vertical formats (shorts, TikTok, reels) get a portrait player */
export function isPortrait(link: Pick<StudyLink, 'url' | 'platform'>): boolean {
  if (link.platform === 'tiktok' || link.platform === 'instagram') return true
  const url = parseUrl(link.url)
  return !!url && url.pathname.startsWith('/shorts/')
}
