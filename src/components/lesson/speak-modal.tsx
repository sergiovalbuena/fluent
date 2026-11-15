'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Mic, Square, Volume2, RotateCcw, ArrowRight, X, Loader2, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SPEECH_MAX_SECONDS, SPEECH_PASS_SCORE, type SpeechError, type SpeechResult, type SpokenWord } from '@/lib/speech'
import { startWavRecorder, type WavRecorder } from '@/lib/wav-recorder'

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'checking' }
  | { kind: 'result'; result: Extract<SpeechResult, { status: 'ok' }> }
  | { kind: 'error'; message: string }

export type SpeakSession = { index: number; total: number; onSkip: () => void; onNext: () => void }

/** Say a word or phrase out loud; Azure scores it and colors each word */
export function SpeakModal({ text, translation, languageCode, onListen, onPassed, onClose, session }: {
  text: string
  translation: string
  languageCode: string
  /** Plays the native audio */
  onListen: () => void
  /** Called once when the score reaches SPEECH_PASS_SCORE */
  onPassed: () => void
  onClose: () => void
  session?: SpeakSession
}) {
  const t = useTranslations('lesson')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const recorderRef = useRef<WavRecorder | null>(null)
  const recordingUrlRef = useRef<string | null>(null)
  const passedRef = useRef(false)

  // Release the mic and the recording when the modal closes
  useEffect(() => () => {
    recorderRef.current?.cancel()
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current)
  }, [])

  async function start() {
    try {
      recorderRef.current = await startWavRecorder(SPEECH_MAX_SECONDS, () => void stop())
      setPhase({ kind: 'recording' })
    } catch {
      setPhase({ kind: 'error', message: t('speak_mic_denied') })
    }
  }

  async function stop() {
    const recorder = recorderRef.current
    recorderRef.current = null
    if (!recorder) return
    setPhase({ kind: 'checking' })
    const wav = await recorder.stop()
    if (!wav) { setPhase({ kind: 'error', message: t('speak_not_heard') }); return }
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current)
    recordingUrlRef.current = URL.createObjectURL(wav)

    const form = new FormData()
    form.append('audio', wav, 'speech.wav')
    form.append('text', text)
    form.append('languageCode', languageCode)
    try {
      const res = await fetch('/api/pronunciation', { method: 'POST', body: form })
      const data = await res.json() as SpeechResult | { error: SpeechError }
      if ('error' in data) {
        setPhase({ kind: 'error', message: t(data.error === 'limit' ? 'speak_limit' : 'speak_error') })
        return
      }
      if (data.status === 'not_heard') { setPhase({ kind: 'error', message: t('speak_not_heard') }); return }
      setPhase({ kind: 'result', result: data })
      if (data.score >= SPEECH_PASS_SCORE && !passedRef.current) {
        passedRef.current = true
        onPassed()
      }
    } catch {
      setPhase({ kind: 'error', message: t('speak_error') })
    }
  }

  function playMine() {
    if (recordingUrlRef.current) void new Audio(recordingUrlRef.current).play()
  }

  const result = phase.kind === 'result' ? phase.result : null
  const passed = !!result && result.score >= SPEECH_PASS_SCORE

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto"
      style={{ background: 'rgba(12,6,24,0.92)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 14 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="relative w-full max-w-md rounded-3xl p-8 flex flex-col items-center gap-5"
        style={{ background: '#140a24', border: '1px solid rgba(167,139,250,0.18)' }}
      >
        <button
          onClick={onClose}
          aria-label={t('speak_close')}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/25 hover:text-white/60 transition-colors"
        >
          <X size={15} />
        </button>

        {session && (
          <div className="w-full flex items-center gap-3 -mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-violet-400/70 transition-all" style={{ width: `${(session.index / session.total) * 100}%` }} />
            </div>
            <span className="text-[11px] font-bold text-white/50 tabular-nums">
              {t('practice_word_of', { n: session.index + 1, total: session.total })}
            </span>
            <button onClick={session.onSkip} className="text-[11px] font-bold text-violet-300/70 hover:text-violet-300 transition-colors mr-6">
              {t('practice_skip')} →
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-violet-300/60 text-[10px] font-bold uppercase tracking-widest">
          <Mic size={10} /> {t('speak_title')}
        </div>

        {/* What to say: colored by word once scored */}
        <div className="text-center">
          <p className="text-white text-2xl font-bold leading-snug">
            {result ? <ScoredText text={text} words={result.words} /> : text}
          </p>
          <p className="text-white/40 text-sm mt-1.5">{translation}</p>
        </div>

        <button
          onClick={onListen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-sky-300 bg-sky-400/10 hover:bg-sky-400/20 transition-colors"
        >
          <Volume2 size={13} /> {t('speak_listen')}
        </button>

        {/* Score */}
        {result && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1">
            <span className={cn('text-5xl font-black tabular-nums', scoreColor(result.score))}>{result.score}</span>
            <span className="text-white/60 text-sm font-semibold text-center">
              {passed ? t('speak_passed') : t('speak_almost')}
            </span>
          </motion.div>
        )}

        {phase.kind === 'error' && (
          <p className="text-sm text-rose-300 text-center leading-relaxed">{phase.message}</p>
        )}

        {/* Main action */}
        {phase.kind === 'recording' ? (
          <button
            onClick={() => void stop()}
            className="relative size-20 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30"
            aria-label={t('speak_stop')}
          >
            <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
            <Square size={26} className="relative fill-white" />
          </button>
        ) : phase.kind === 'checking' ? (
          <div className="size-20 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Loader2 size={28} className="text-violet-300 animate-spin" />
          </div>
        ) : passed && session ? (
          <button
            onClick={session.onNext}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white font-bold transition-colors"
          >
            {t('speak_next')} <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => void start()}
            className="size-20 rounded-full bg-violet-500 hover:bg-violet-400 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 transition-all"
            aria-label={result || phase.kind === 'error' ? t('speak_again') : t('speak_tap')}
          >
            {result || phase.kind === 'error' ? <RotateCcw size={28} /> : <Mic size={30} />}
          </button>
        )}

        <p className="text-white/35 text-xs text-center -mt-2">
          {phase.kind === 'recording' ? t('speak_listening')
            : phase.kind === 'checking' ? t('speak_checking')
            : passed && session ? ''
            : result || phase.kind === 'error' ? t('speak_again')
            : t('speak_tap')}
        </p>

        {result && (
          <button onClick={playMine} className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white/80 transition-colors">
            <Play size={12} /> {t('speak_my_voice')}
          </button>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function scoreColor(score: number) {
  return score >= SPEECH_PASS_SCORE ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'
}

/** Normalized for matching: Azure answers in lowercase, without punctuation */
function norm(word: string) {
  return word.toLocaleLowerCase().replace(/[^\p{L}\p{N}'’]/gu, '').replace(/’/g, "'")
}

/** Pairs each word of the text with the score Azure gave it (in order; null when unmatched) */
function matchWords(tokens: string[], words: SpokenWord[]): (SpokenWord | null)[] {
  const scored = words.filter(w => w.error !== 'Insertion')
  const out: (SpokenWord | null)[] = []
  let next = 0
  for (const token of tokens) {
    if (/^\s+$/.test(token) || !norm(token)) { out.push(null); continue }
    // Look a couple ahead in case Azure split or merged a word
    let match = -1
    for (let j = next; j < Math.min(next + 3, scored.length); j++) {
      if (norm(scored[j].word) === norm(token)) { match = j; break }
    }
    if (match === -1) { out.push(null); continue }
    next = match + 1
    out.push(scored[match])
  }
  return out
}

/** The text to say, each word colored by its score; words left out are struck through */
function ScoredText({ text, words }: { text: string; words: SpokenWord[] }) {
  const tokens = text.split(/(\s+)/)
  const matched = matchWords(tokens, words)
  return (
    <>
      {tokens.map((token, i) => {
        const w = matched[i]
        if (!w) return <span key={i}>{token}</span>
        return (
          <span key={i} title={`${w.score}`} className={w.error === 'Omission' ? 'text-rose-400/70 line-through' : scoreColor(w.score)}>
            {token}
          </span>
        )
      })}
    </>
  )
}
