'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Check, Clock, Copy, ExternalLink, Music, Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { SONGS, type Song } from '@/data/songs'
import { createClient } from '@/lib/supabase/client'
import { addRewards } from '@/lib/rewards'

// Music Time: lyrics training over a YouTube video. The lyrics show with gaps;
// the learner fills them (choose among 4 or type) while the song plays. Lines
// with a `start` time make the video pause at the end of each line with a gap.

type Phase = 'pick' | 'play' | 'finished'
type Level = 'easy' | 'hard'
type Gap = { line: number; word: string; start: number; options: string[] }

// ── YouTube IFrame API (minimal typing) ───────────────────────────────────────
type YTPlayer = {
  playVideo(): void
  pauseVideo(): void
  seekTo(s: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getPlayerState(): number
  setPlaybackRate(r: number): void
  destroy(): void
}
type YTNamespace = {
  Player: new (el: HTMLElement, opts: {
    videoId: string
    playerVars?: Record<string, number | string>
    events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void }
  }) => YTPlayer
}
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let ytApi: Promise<YTNamespace> | null = null
function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!ytApi) {
    ytApi = new Promise(resolve => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return ytApi
}

/** A YouTube player bound to a div; returns the player once ready */
function useYouTube(videoId: string | null, onState?: (s: number) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<YTPlayer | null>(null)
  const [failed, setFailed] = useState(false)
  const stateRef = useRef(onState)
  useEffect(() => { stateRef.current = onState }, [onState])

  useEffect(() => {
    if (!videoId || !ref.current) return
    let p: YTPlayer | null = null
    let cancelled = false
    const host = document.createElement('div')
    ref.current.appendChild(host)
    loadYouTube().then(YT => {
      if (cancelled) return
      p = new YT.Player(host, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, cc_load_policy: 0 },
        events: {
          onReady: () => { if (!cancelled) setPlayer(p) },
          onStateChange: e => stateRef.current?.(e.data),
          onError: () => { if (!cancelled) setFailed(true) },
        },
      })
    })
    return () => { cancelled = true; p?.destroy(); host.remove(); setPlayer(null); setFailed(false) }
  }, [videoId])

  return { ref, player, failed }
}

// ── Gaps ──────────────────────────────────────────────────────────────────────
const SKIP: Record<string, Set<string>> = {
  fr: new Set(['les', 'des', 'une', 'qui', 'que', 'dans', 'pour', 'par', 'sur', 'sous', 'mon', 'ton', 'son', 'ces', 'est', 'pas', 'plus', 'tes', 'mes', 'ses', 'aux', 'nous', 'vous', 'elle', 'puis', 'encore', 'comme']),
  en: new Set(['the', 'and', 'was', 'his', 'her', 'its', 'with', 'that', 'what', 'you', 'are', 'all', 'but', 'had', 'how', 'like', 'down', 'came', 'here', 'there', 'sure']),
}
const WORD = /[\p{L}]+(?:[’'-][\p{L}]+)*/gu

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** One gap per chosen line: a content word; easy = about half the lines, hard = every line */
function buildGaps(song: Song, lang: string, level: Level): Gap[] {
  const skip = SKIP[lang] ?? new Set<string>()
  const candidates = song.lines.map(line => [...line.text.matchAll(WORD)]
    .map(m => ({ word: m[0], start: m.index! }))
    .filter(w => w.word.length >= 3 && !skip.has(w.word.toLowerCase()) && !/[’']/.test(w.word)))
  const vocabulary = [...new Set(candidates.flat().map(c => c.word.toLowerCase()))]
  const lineIdx = song.lines.map((_, i) => i).filter(i => candidates[i].length > 0)
  const chosen = level === 'hard' ? lineIdx : lineIdx.filter((_, k) => k % 2 === 0)
  return chosen.map(line => {
    const c = shuffle(candidates[line])[0]
    const others = shuffle(vocabulary.filter(v => v !== c.word.toLowerCase())).slice(0, 3)
    return { line, word: c.word, start: c.start, options: shuffle([c.word.toLowerCase(), ...others]) }
  })
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").trim()

async function saveGameResult(correct: number, total: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  return addRewards(supabase, user.id, { xp: pct >= 80 ? 15 : pct >= 60 ? 10 : 5, gems: 3, reason: 'minigame', ref: 'musictime' })
}

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MusicTimePage() {
  return (
    <Suspense>
      <MusicTime />
    </Suspense>
  )
}

function MusicTime() {
  const t = useTranslations('games')
  const tm = useTranslations('mini_games')
  const { languageCode } = useActiveLanguage()
  const songs = SONGS[languageCode] ?? []
  const syncId = useSearchParams().get('sync')
  const syncSong = songs.find(s => s.id === syncId) ?? null

  const [phase, setPhase] = useState<Phase>('pick')
  const [level, setLevel] = useState<Level>('easy')
  const [song, setSong] = useState<Song | null>(null)
  const [gaps, setGaps] = useState<Gap[]>([])
  const [filled, setFilled] = useState<Record<number, boolean>>({})   // gap index → first try right
  const [current, setCurrent] = useState(0)
  const [typed, setTyped] = useState('')
  const [wrong, setWrong] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)

  function start(s: Song) {
    setSong(s)
    setGaps(buildGaps(s, languageCode, level))
    setFilled({})
    setCurrent(0)
    setTyped('')
    setWrong(null)
    setMisses(0)
    setRewards(null)
    setPhase('play')
  }

  if (syncSong) return <SyncTool song={syncSong} />

  const back = { href: '/mini-games', label: tm('title') }

  // ── Pick a song ─────────────────────────────────────────────────────────────
  if (phase === 'pick' || !song) {
    return (
      <Shell back={back} title={tm('musictime_title')}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-700 shadow-xl">
              <Music size={26} className="text-white" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">{tm('musictime_title')}</h1>
              <p className="text-sm text-white/50">{t('mt_intro')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['easy', 'hard'] as const).map(lv => (
              <button
                key={lv}
                type="button"
                aria-pressed={level === lv}
                onClick={() => setLevel(lv)}
                className={cn('rounded-2xl border-2 p-3 text-left transition-colors', level === lv ? 'border-fuchsia-400 bg-fuchsia-500/10' : 'border-white/10 hover:border-white/25')}
              >
                <span className="block text-sm font-bold text-white">{t(`mt_${lv}`)}</span>
                <span className="block text-xs text-white/50">{t(`mt_${lv}_hint`)}</span>
              </button>
            ))}
          </div>

          {songs.length === 0 ? (
            <p className="rounded-2xl bg-white/5 p-6 text-center text-sm text-white/50">{t('mt_no_songs')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {songs.map(s => {
                const timed = s.lines.some(x => x.start !== undefined)
                return (
                  <button key={s.id} type="button" onClick={() => start(s)} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left transition hover:border-fuchsia-400/50">
                    <span className="relative block aspect-video overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail CDN */}
                      <img src={thumb(s.videoId)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="flex size-11 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                          <Play size={18} className="ml-0.5 fill-fuchsia-700 text-fuchsia-700" />
                        </span>
                      </span>
                      {timed && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white"><Timer size={10} /> {t('mt_synced')}</span>}
                    </span>
                    <span className="block p-3">
                      <span className="block font-bold text-white">{s.title}</span>
                      <span className="block text-xs text-white/40">{s.origin}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Shell>
    )
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const correct = Object.values(filled).filter(Boolean).length
    const pct = gaps.length ? Math.round((correct / gaps.length) * 100) : 0
    return (
      <Shell back={back} title={tm('musictime_title')}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-6 text-center">
          <span className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪'}</span>
          <div>
            <h2 className="text-3xl font-bold text-white">{pct >= 80 ? t('headline_great') : pct >= 50 ? t('headline_good') : t('headline_keep')}</h2>
            <p className="mt-1 text-sm text-white/40">{song.title}</p>
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-4xl font-bold tabular-nums text-fuchsia-400">{correct}/{gaps.length}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/40">{t('mt_first_try')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-4xl font-bold tabular-nums text-white">{pct}%</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/40">{t('stat_accuracy')}</p>
            </div>
          </div>
          {rewards && (
            <div className="flex gap-3 text-lg font-bold">
              <span className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-2.5 text-yellow-400">+{rewards.xp} XP</span>
              <span className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-5 py-2.5 text-sky-300">+{rewards.gems} 💎</span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => start(song)} className="rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-700 px-6 py-3 text-sm font-bold text-white">{t('play_again')}</button>
            <button type="button" onClick={() => setPhase('pick')} className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-bold text-white/70 hover:bg-white/10">{t('mt_other_song')}</button>
          </div>
        </motion.div>
      </Shell>
    )
  }

  // ── Play ────────────────────────────────────────────────────────────────────
  return (
    <Shell back={back} title={tm('musictime_title')}>
      <Player
        song={song}
        gaps={gaps}
        level={level}
        filled={filled}
        current={current}
        typed={typed}
        wrong={wrong}
        setTyped={setTyped}
        onAnswer={answer => {
          const gap = gaps[current]
          if (!gap) return
          if (norm(answer) === norm(gap.word)) {
            const firstTry = misses === 0
            const next = { ...filled, [current]: firstTry }
            setFilled(next)
            setMisses(0)
            setWrong(null)
            setTyped('')
            if (current + 1 >= gaps.length) {
              setPhase('finished')
              const correct = Object.values(next).filter(Boolean).length
              saveGameResult(correct, gaps.length).then(setRewards)
            } else {
              setCurrent(current + 1)
            }
          } else {
            setMisses(m => m + 1)
            setWrong(answer)
          }
        }}
        // Shown after a miss: fills the gap (it no longer counts as right on the first try)
        onReveal={() => {
          const gap = gaps[current]
          if (!gap) return
          const next = { ...filled, [current]: false }
          setFilled(next)
          setMisses(0)
          setWrong(null)
          setTyped('')
          if (current + 1 >= gaps.length) {
            setPhase('finished')
            saveGameResult(Object.values(next).filter(Boolean).length, gaps.length).then(setRewards)
          } else {
            setCurrent(current + 1)
          }
        }}
      />
    </Shell>
  )
}

function Player({ song, gaps, level, filled, current, typed, wrong, setTyped, onAnswer, onReveal }: {
  song: Song
  gaps: Gap[]
  level: Level
  filled: Record<number, boolean>
  current: number
  typed: string
  wrong: string | null
  setTyped: (s: string) => void
  onAnswer: (s: string) => void
  onReveal: () => void
}) {
  const t = useTranslations('games')
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [activeLine, setActiveLine] = useState(-1)
  const { ref, player, failed } = useYouTube(song.videoId, s => setPlaying(s === 1))
  const timed = song.lines.some(l => l.start !== undefined)
  const gap = gaps[current]
  const lineEl = useRef<Record<number, HTMLLIElement | null>>({})

  // Timed songs: follow the current line, and pause at the end of a line whose gap isn't filled yet
  useEffect(() => {
    if (!player || !timed) return
    const id = setInterval(() => {
      const now = player.getCurrentTime()
      let idx = -1
      song.lines.forEach((l, i) => { if (l.start !== undefined && l.start <= now) idx = i })
      setActiveLine(idx)
      if (gap && player.getPlayerState() === 1) {
        const nextStart = song.lines.slice(gap.line + 1).find(l => l.start !== undefined)?.start
        if (nextStart !== undefined && now >= nextStart - 0.15) {
          player.pauseVideo()
          player.seekTo(nextStart - 0.2, true)
        }
      }
    }, 150)
    return () => clearInterval(id)
  }, [player, timed, song, gap])

  // Keep the line with the gap in view
  useEffect(() => {
    if (gap) lineEl.current[gap.line]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [gap])

  // A gap filled in a timed song resumes playback
  const lastCurrent = useRef(current)
  useEffect(() => {
    if (current !== lastCurrent.current && timed && player && player.getPlayerState() !== 1) player.playVideo()
    lastCurrent.current = current
  }, [current, timed, player])

  const gapsByLine = useMemo(() => new Map(gaps.map((g, i) => [g.line, i])), [gaps])

  function renderLine(text: string, lineIdx: number) {
    const gi = gapsByLine.get(lineIdx)
    if (gi === undefined) return text
    const g = gaps[gi]
    const done = gi in filled
    const before = text.slice(0, g.start)
    const after = text.slice(g.start + g.word.length)
    return (
      <>
        {before}
        <span
          className={cn(
            'mx-0.5 inline-block min-w-[4.5rem] rounded-md px-1.5 text-center font-bold',
            done ? (filled[gi] ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300')
              : gi === current ? 'border-b-2 border-fuchsia-400 bg-fuchsia-500/15 text-transparent' : 'border-b-2 border-white/20 text-transparent',
          )}
        >
          {done ? g.word : '·'.repeat(Math.max(3, g.word.length))}
        </span>
        {after}
      </>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row">
      <div className="flex flex-col gap-3 lg:w-[55%]">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black [&_iframe]:size-full" ref={ref}>
          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-white/70">
              {t('mt_video_error')}
              <a href={`https://www.youtube.com/watch?v=${song.videoId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 font-bold text-white">
                <ExternalLink size={14} /> {t('mt_open_youtube')}
              </a>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!player} onClick={() => (playing ? player?.pauseVideo() : player?.playVideo())} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 font-bold text-white disabled:opacity-40">
            {playing ? <Pause size={16} /> : <Play size={16} className="fill-current" />} {playing ? t('mt_pause') : t('mt_play')}
          </button>
          <button type="button" disabled={!player} onClick={() => player?.seekTo(Math.max(0, player.getCurrentTime() - 5), true)} className="flex h-11 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-bold text-white disabled:opacity-40">
            <RotateCcw size={15} /> 5 s
          </button>
          <button type="button" disabled={!player} onClick={() => { const r = rate === 1 ? 0.75 : 1; setRate(r); player?.setPlaybackRate(r) }} className={cn('flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold disabled:opacity-40', rate !== 1 ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-white/10 text-white')}>
            <Clock size={15} /> {rate}×
          </button>
        </div>
        <p className="text-xs text-white/40">{timed ? t('mt_timed_hint') : t('mt_free_hint')}</p>
      </div>

      <div className="flex flex-col gap-3 lg:w-[45%]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-white">{song.title}</p>
            <p className="text-xs text-white/40">{song.origin}</p>
          </div>
          <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-xs font-bold tabular-nums text-fuchsia-300">{t('mt_gaps', { done: Object.keys(filled).length, total: gaps.length })}</span>
        </div>

        <ol className="max-h-[42vh] space-y-1.5 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:max-h-[50vh]">
          {song.lines.map((line, i) => (
            <li
              key={i}
              ref={el => { lineEl.current[i] = el }}
              className={cn('rounded-lg px-2 py-1 text-base leading-relaxed transition-colors', i === activeLine ? 'bg-white/10 text-white' : gap?.line === i ? 'text-white' : 'text-white/60')}
            >
              {renderLine(line.text, i)}
            </li>
          ))}
        </ol>

        {gap && (
          <motion.div key={current} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
            {level === 'easy' ? (
              <div className="grid grid-cols-2 gap-2">
                {gap.options.map(opt => (
                  <motion.button
                    key={opt}
                    type="button"
                    onClick={() => onAnswer(opt)}
                    animate={wrong === opt ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.35 }}
                    className={cn('rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors', wrong === opt ? 'border-red-400 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:border-fuchsia-400/60')}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); if (typed.trim()) onAnswer(typed) }} className="flex gap-2">
                <input
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  autoFocus autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
                  placeholder={t('type_word')}
                  className={cn('h-12 min-w-0 flex-1 rounded-xl border-2 bg-white/5 px-3 font-semibold text-white placeholder:text-white/30 focus:outline-none', wrong ? 'border-red-400' : 'border-white/10 focus:border-fuchsia-400')}
                />
                <button type="submit" disabled={!typed.trim()} className="flex h-12 items-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 px-4 font-bold text-white disabled:opacity-40">
                  <Check size={18} />
                </button>
              </form>
            )}
            {wrong && (
              <button type="button" onClick={onReveal} className="self-start text-xs font-semibold text-white/50 underline-offset-2 hover:text-white hover:underline">
                {t('mt_reveal')}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** Capture line start times: play, and press "Mark" (or Space) when each line begins */
function SyncTool({ song }: { song: Song }) {
  const t = useTranslations('games')
  const { ref, player } = useYouTube(song.videoId)
  const [times, setTimes] = useState<number[]>([])
  const [copied, setCopied] = useState(false)

  const mark = useCallback(() => {
    if (!player) return
    setTimes(ts => (ts.length < song.lines.length ? [...ts, Math.round(player.getCurrentTime() * 10) / 10] : ts))
  }, [player, song.lines.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.code === 'Space') { e.preventDefault(); mark() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mark])

  const json = JSON.stringify(song.lines.map((l, i) => ({ text: l.text, ...(times[i] !== undefined ? { start: times[i] } : {}) })), null, 2)

  return (
    <Shell back={{ href: '/mini-games/musictime', label: song.title }} title={t('mt_sync_title')}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <p className="text-sm text-white/60">{t('mt_sync_hint')}</p>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black [&_iframe]:size-full" ref={ref} />
        <div className="flex gap-2">
          <button type="button" onClick={mark} disabled={!player} className="h-12 flex-1 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 font-bold text-white disabled:opacity-40">{t('mt_mark')} ({times.length}/{song.lines.length})</button>
          <button type="button" onClick={() => setTimes(ts => ts.slice(0, -1))} className="h-12 rounded-xl bg-white/10 px-4 font-bold text-white"><RotateCcw size={16} /></button>
          <button type="button" onClick={() => { navigator.clipboard.writeText(json).then(() => setCopied(true)) }} className="flex h-12 items-center gap-2 rounded-xl bg-white/10 px-4 font-bold text-white">
            <Copy size={16} /> {copied ? t('mt_copied') : t('mt_copy')}
          </button>
        </div>
        <ol className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          {song.lines.map((l, i) => (
            <li key={i} className={cn('flex gap-3', i === times.length ? 'font-bold text-white' : 'text-white/50')}>
              <span className="w-12 shrink-0 tabular-nums text-fuchsia-300">{times[i] !== undefined ? `${times[i]}s` : ''}</span>
              {l.text}
            </li>
          ))}
        </ol>
      </div>
    </Shell>
  )
}

function Shell({ back, title, children }: { back: { href: string; label: string }; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0f0518' }}>
      <AppTopbar title={title} back={back} />
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
