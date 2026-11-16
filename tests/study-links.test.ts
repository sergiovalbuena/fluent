import { describe, expect, it } from 'vitest'
import { detectPlatform, instagramCode, parseUrl, tiktokId, youtubeId } from '@/lib/study-links'

describe('parseUrl', () => {
  it('normalizes to https and adds the scheme when missing', () => {
    expect(parseUrl('youtube.com/watch?v=dQw4w9WgXcQ')?.toString()).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ')
    expect(parseUrl('http://example.com/a')?.protocol).toBe('https:')
  })
  it('rejects what is not a web address', () => {
    expect(parseUrl('')).toBeNull()
    expect(parseUrl('javascript:alert(1)')).toBeNull()
    expect(parseUrl('localhost')).toBeNull()
    expect(parseUrl('not a url')).toBeNull()
  })
})

describe('platforms', () => {
  const url = (s: string) => parseUrl(s)!

  it('detects the platform from the host only', () => {
    expect(detectPlatform(url('https://www.youtube.com/watch?v=abc123def45'))).toBe('youtube')
    expect(detectPlatform(url('https://youtu.be/abc123def45'))).toBe('youtube')
    expect(detectPlatform(url('https://vm.tiktok.com/ZM123/'))).toBe('tiktok')
    expect(detectPlatform(url('https://www.instagram.com/reel/Cabc12345/'))).toBe('instagram')
    expect(detectPlatform(url('https://youtube.com.evil.example/watch?v=abc123def45'))).toBe('other')
    expect(detectPlatform(url('https://eviltiktok.com/x'))).toBe('other')
  })
  it('reads video ids, and nothing that does not look like one', () => {
    expect(youtubeId(url('https://www.youtube.com/watch?v=abc123def45'))).toBe('abc123def45')
    expect(youtubeId(url('https://youtu.be/abc123def45?t=3'))).toBe('abc123def45')
    expect(youtubeId(url('https://www.youtube.com/shorts/abc123def45'))).toBe('abc123def45')
    expect(youtubeId(url('https://www.youtube.com/watch?v=<script>'))).toBeNull()
    expect(tiktokId(url('https://www.tiktok.com/@user/video/7300000000000000000'))).toBe('7300000000000000000')
    expect(instagramCode(url('https://www.instagram.com/reels/Cabc12345/'))).toEqual({ kind: 'reel', code: 'Cabc12345' })
  })
})
