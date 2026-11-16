'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, X, RotateCcw, Zap, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { type ChallengeRound, applyTyped, autoAdvance, buildHintSet, isAutoChar, roundLabelKey, sameChar, textHash } from '@/components/lesson/player/word-challenge-modal'
import { speakWord } from '@/components/lesson/player/item-lists'

// ─── Story Challenge Modal ────────────────────────────────────────────────────

export function splitStory(text: string): string[] {
  // Split on sentence boundaries, then break any long chunk on commas
  const raw = text.split(/(?<=[.!?¡¿])\s+/).flatMap(s => {
    const t = s.trim()
    if (!t) return []
    if (t.length <= 72) return [t]
    // Long sentence — split on comma-space, re-join until ~60 chars
    const parts = t.split(/,\s+/)
    const out: string[] = []
    let cur = ''
    for (const p of parts) {
      const next = cur ? `${cur}, ${p}` : p
      if (next.length > 72 && cur) { out.push(cur); cur = p }
      else cur = next
    }
    if (cur) out.push(cur)
    return out
  })
  return raw.filter(Boolean)
}

export type StoryProgress = { round: ChallengeRound; phraseIdx: number; stars: number }

export function readStoryProgress(key: string, phrases: number): StoryProgress | null {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? 'null') as StoryProgress | null
    if (!p || ![1, 2, 3].includes(p.round) || p.phraseIdx < 0 || p.phraseIdx >= phrases) return null
    return p.round === 1 && p.phraseIdx === 0 ? null : p
  } catch {
    return null
  }
}

export function writeStoryProgress(key: string, p: StoryProgress) {
  try { localStorage.setItem(key, JSON.stringify(p)) } catch { /* private mode: not kept */ }
}

export function clearStoryProgress(key: string) {
  try { localStorage.removeItem(key) } catch { /* private mode */ }
}

export function StoryChallengeModal({ storyText, languageCode, onClose }: {
  storyText: string
  languageCode: string
  onClose: () => void
}) {
  const t = useTranslations('lesson')
  const phrases   = useMemo(() => splitStory(storyText), [storyText])
  // Stories are long: where the learner left off is kept on this device
  const progressKey = `fluent:story:${languageCode}:${textHash(storyText)}`
  const [saved] = useState(() => readStoryProgress(progressKey, phrases.length))
  const [round, setRound]           = useState<ChallengeRound>(saved?.round ?? 1)
  const [phraseIdx, setPhraseIdx]   = useState(saved?.phraseIdx ?? 0)
  const [typed, setTyped]           = useState(() => autoAdvance('', phrases[saved?.phraseIdx ?? 0] ?? ''))
  const [shake, setShake]           = useState(false)
  const [phraseDone, setPhraseDone] = useState(false)
  const [stars, setStars]           = useState(saved?.stars ?? 0)
  const [allDone, setAllDone]       = useState(false)
  const [resumed, setResumed]       = useState(saved !== null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Set after an «o» typed for œ: the «e» that follows is skipped
  const pendingOe = useRef(false)

  useEffect(() => {
    if (allDone) clearStoryProgress(progressKey)
    else writeStoryProgress(progressKey, { round, phraseIdx, stars })
  }, [progressKey, round, phraseIdx, stars, allDone])

  function restart() {
    setRound(1); setPhraseIdx(0); setStars(0); setPhraseDone(false); setResumed(false)
    setTyped(autoAdvance('', phrases[0] ?? ''))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const target  = phrases[phraseIdx] ?? ''
  const hintSet = useMemo(() => buildHintSet(target, round), [target, round])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [round, phraseIdx])

  const advancePhrase = useCallback(() => {
    const isLastPhrase = phraseIdx >= phrases.length - 1
    if (!isLastPhrase) {
      setPhraseIdx(i => i + 1)
      setTyped(autoAdvance('', phrases[phraseIdx + 1]))
      setPhraseDone(false)
    } else if (round < 3) {
      setRound(r => (r + 1) as ChallengeRound)
      setPhraseIdx(0)
      setTyped(autoAdvance('', phrases[0]))
      setPhraseDone(false)
      setStars(s => s + 1)
    } else {
      setStars(3)
      setAllDone(true)
    }
  }, [phraseIdx, phrases, round])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && phraseDone) advancePhrase()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, phraseDone, advancePhrase])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (phraseDone || e.key !== 'Backspace') return
    e.preventDefault() // deletion is handled entirely below, not via native input diffing
    pendingOe.current = false
    setTyped(t => {
      if (t.length === 0) return t
      let newLen = t.length - 1
      while (newLen > 0 && isAutoChar(target, newLen - 1)) newLen--
      if (inputRef.current) inputRef.current.value = t.slice(0, newLen)
      return t.slice(0, newLen)
    })
  }, [phraseDone, target])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (phraseDone) return
    const val = e.target.value

    if (val.length <= typed.length) {
      // Deletions are handled in handleKeyDown; resync defensively for any
      // other edit path (select-all + delete, cut, etc.)
      e.target.value = typed
      return
    }

    const { next, mistake } = applyTyped(typed, val.slice(typed.length), target, pendingOe)
    if (mistake) {
      setShake(true)
      setTimeout(() => setShake(false), 380)
    }

    setTyped(next)
    e.target.value = next // keep the native input in sync so the next keystroke diffs correctly
    if (next.length === target.length) setPhraseDone(true)
  }, [phraseDone, target, typed])

  // Group characters into word segments so words never break mid-line
  const wordSegments = useMemo(() => {
    type Seg = { type: 'word'; chars: { display: string; cls: string; isCursor: boolean }[] } | { type: 'space' }
    const segs: Seg[] = []
    let word: { display: string; cls: string; isCursor: boolean }[] = []

    target.split('').forEach((ch, i) => {
      const isTyped  = i < typed.length
      const isCursor = i === typed.length
      const isHint   = hintSet.has(i)

      if (ch === ' ') {
        if (word.length) { segs.push({ type: 'word', chars: word }); word = [] }
        segs.push({ type: 'space' })
        return
      }

      let display: string
      let cls: string
      if (isTyped) {
        const ok = sameChar(typed[i], ch)
        display = ch; cls = ok ? 'text-lime-400' : 'text-red-400'
      } else if (round === 1) {
        display = ch; cls = isCursor ? 'text-white/70' : 'text-white/25'
      } else if (isHint) {
        display = ch; cls = isCursor ? 'text-white/70' : 'text-white/30'
      } else {
        display = '·'; cls = isCursor ? 'text-white/60' : 'text-white/20'
      }
      word.push({ display, cls, isCursor })
    })
    if (word.length) segs.push({ type: 'word', chars: word })
    return segs
  }, [target, typed, hintSet, round])

  const cursorInSpace = typed.length < target.length && target[typed.length] === ' '
  const progress      = target.length ? typed.length / target.length : 0
  const totalProgress = (phraseIdx + (phraseDone ? 1 : progress)) / phrases.length

  return (
    <AnimatePresence>
      <motion.div
        key="story-challenge-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto"
        style={{ background: 'rgba(5,14,0,0.92)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          key={`${round}-${phraseIdx}`}
          initial={{ scale: 0.93, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 14 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="relative w-full max-w-2xl rounded-3xl p-8 flex flex-col items-center gap-5"
          style={{ background: '#0a1a05', border: '1px solid rgba(132,204,22,0.15)' }}
          onClick={() => { if (!phraseDone && !allDone) inputRef.current?.focus() }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-white/25 hover:text-white/60 transition-colors">
            <X size={15} />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-2 text-lime-400/60 text-[10px] font-bold uppercase tracking-widest">
              <Zap size={10} /> Story Challenge
            </div>
            <div className="flex items-center gap-2">
              {([1, 2, 3] as ChallengeRound[]).map(s => (
                <motion.span key={s} animate={stars >= s ? { scale: [1, 1.5, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
                  <Star size={22} className={cn('transition-all', stars >= s ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-white/20')} />
                </motion.span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {([1, 2, 3] as ChallengeRound[]).map(r => (
                <div key={r} className={cn('h-1 rounded-full transition-all duration-300', r < round ? 'w-6 bg-lime-400' : r === round ? 'w-10 bg-lime-400/80' : 'w-6 bg-white/15')} />
              ))}
            </div>
            <p className="text-white/35 text-[11px] font-semibold">
              {t('round_n', { n: round })} · {t(roundLabelKey(round, target))}
            </p>
          </div>

          {/* Phrase counter dots */}
          {!allDone && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {phrases.map((_, i) => (
                <div key={i} className={cn(
                  'rounded-full transition-all duration-300',
                  i < phraseIdx ? 'w-5 h-1.5 bg-lime-400' :
                  i === phraseIdx ? 'w-8 h-1.5 bg-lime-400/80' : 'w-5 h-1.5 bg-white/15'
                )} />
              ))}
              <span className="text-white/30 text-[10px] font-semibold ml-1">
                {phraseIdx + 1} / {phrases.length}
              </span>
            </div>
          )}

          {allDone ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <p className="text-4xl">🏆</p>
              <p className="text-lime-400 font-bold text-xl text-center">{t('story_mastered')}</p>
              <p className="text-white/40 text-sm text-center">{t('story_mastered_text')}</p>
              <button
                onClick={onClose}
                className="mt-2 px-8 py-3 rounded-2xl text-sm font-bold text-black hover:scale-105 active:scale-95 transition-all"
                style={{ background: '#a3e635' }}
              >
                Continue →
              </button>
            </motion.div>
          ) : (
            <>
              {/* Audio button */}
              <div className="flex items-center gap-2 -mb-2">
                <button
                  // Keep the keyboard on the text: listening must not end the typing
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { speakWord(target, languageCode); inputRef.current?.focus() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-semibold transition-all active:scale-95"
                >
                  <Volume2 size={13} />
                  {t('story_listen')}
                </button>
                {resumed && (round > 1 || phraseIdx > 0) && (
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={restart}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-semibold transition-all active:scale-95"
                  >
                    <RotateCcw size={12} />
                    {t('story_restart')}
                  </button>
                )}
              </div>

              {/* Words — no mid-word line breaks */}
              <motion.div
                animate={shake ? { x: [0, -9, 9, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.38 }}
                className="flex flex-wrap justify-center gap-x-1.5 gap-y-2 items-center px-2 min-h-[3rem]"
              >
                {wordSegments.map((seg, wi) => {
                  if (seg.type === 'space') return null
                  return (
                    <span key={wi} className="inline-flex whitespace-nowrap relative">
                      {seg.chars.map(({ display, cls, isCursor }, ci) => (
                        <span key={ci} className={cn('relative text-xl font-bold tracking-wide transition-colors duration-75', cls)}>
                          {display}
                          {isCursor && !phraseDone && (
                            <motion.span
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ repeat: Infinity, duration: 0.85 }}
                              className="absolute -right-px top-[8%] bottom-[4%] w-[2px] bg-lime-400/70 rounded-full"
                            />
                          )}
                        </span>
                      ))}
                      {/* cursor between words (space position) */}
                      {cursorInSpace && wi === wordSegments.filter(s => s.type === 'word').indexOf(seg) && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 0.85 }}
                          className="absolute -right-1 top-[8%] bottom-[4%] w-[2px] bg-lime-400/70 rounded-full"
                        />
                      )}
                    </span>
                  )
                })}
              </motion.div>

              {/* Overall progress bar */}
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', phraseDone ? 'bg-lime-400' : 'bg-lime-400/50')}
                  animate={{ width: `${totalProgress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              <input
                ref={inputRef} value={typed} onChange={handleChange} onKeyDown={handleKeyDown}
                className="opacity-0 absolute pointer-events-none w-0 h-0"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              />

              <AnimatePresence mode="wait">
                {phraseDone ? (
                  <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col items-center gap-3">
                    <p className="text-lime-400 font-bold text-sm">
                      {phraseIdx < phrases.length - 1 ? `✓ ${t('correct_short')}` :
                        round === 1 ? '⭐ Round 1 done!' :
                        round === 2 ? '⭐⭐ Halfway there!' : '⭐⭐⭐ ¡Dominado!'}
                    </p>
                    <button
                      onClick={advancePhrase}
                      className="px-7 py-2.5 rounded-2xl text-sm font-bold text-black hover:scale-105 active:scale-95 transition-all"
                      style={{ background: '#a3e635' }}
                    >
                      {phraseIdx < phrases.length - 1 ? `${t('next_phrase')} →` : round < 3 ? `${t('next_round')} →` : t('done')}
                    </button>
                  </motion.div>
                ) : (
                  <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-white/20 text-xs">
                    {typed.length === 0 ? t('start_typing') : `${typed.length} / ${target.length}`}
                  </motion.p>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
