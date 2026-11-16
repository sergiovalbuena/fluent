'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { useLocale, useTranslations } from 'next-intl'

// ─── Word Challenge Modal ─────────────────────────────────────────────────────

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Punctuation the user shouldn't need to type — auto-inserted. Includes the
// slash between alternatives («enchanté / enchantée»), hard to reach on mobile
export const SKIPPABLE = /^[¿¡.,!?;:'"()\-–—…«»’‘“”/·]+$/

export const isSpace = (c: string | undefined) => !!c && /\s/.test(c)

/** Same character for typing purposes: any space matches any space (French uses non-breaking ones), ’ matches ' */
export function sameChar(a: string, b: string): boolean {
  if (isSpace(a) || isSpace(b)) return isSpace(a) && isSpace(b)
  return norm(a.replace(/[’‘]/g, "'")) === norm(b.replace(/[’‘]/g, "'"))
}

/** œ is missing from most keyboards: «oe» types it (the o fills the œ, the e is then skipped) */
export const isLigatureOe = (c: string | undefined) => c === 'œ' || c === 'Œ'

/**
 * Applies newly inserted characters to what's typed so far, in order (handles
 * autocomplete, IME composition or paste inserting several at once). Stops at
 * the first wrong one. `pendingOe` carries the «e» to skip after an «o» for œ.
 */
export function applyTyped(typed: string, added: string, target: string, pendingOe: { current: boolean }): { next: string; mistake: boolean } {
  let next = typed
  for (const ch of added) {
    if (pendingOe.current) {
      pendingOe.current = false
      if (ch === 'e' || ch === 'E') continue
    }
    if (next.length >= target.length) break
    if (isLigatureOe(target[next.length]) && (ch === 'o' || ch === 'O')) {
      next = autoAdvance(next + target[next.length], target)
      pendingOe.current = true
      continue
    }
    if (sameChar(ch, target[next.length])) {
      next = autoAdvance(next + ch, target)
      continue
    }
    // Redundant punctuation the user typed that auto-advance already
    // inserted for them (e.g. a comma right before the cursor) — ignore it
    // instead of treating it as a mistake
    if ((SKIPPABLE.test(ch) || isSpace(ch)) && next.length > 0 && sameChar(ch, target[next.length - 1])) continue
    return { next, mistake: true }
  }
  return { next, mistake: false }
}

export const punctuationOnly = (token: string) => token.length > 0 && [...token].every(c => SKIPPABLE.test(c))

/**
 * Characters the learner never types: punctuation, and the spaces that only sit
 * next to punctuation — French writes « Bonjour » and « Ça va ? » with spaces
 * inside the quotes and before ? ! : ;
 */
export function isAutoChar(target: string, i: number): boolean {
  const ch = target[i]
  if (SKIPPABLE.test(ch)) return true
  if (!isSpace(ch)) return false
  let a = i - 1
  while (a >= 0 && !isSpace(target[a])) a--
  let b = i + 1
  while (b < target.length && !isSpace(target[b])) b++
  const before = target.slice(a + 1, i)
  return before.length === 0 || punctuationOnly(before) || punctuationOnly(target.slice(i + 1, b))
}

export function autoAdvance(current: string, target: string): string {
  let s = current
  while (s.length < target.length && isAutoChar(target, s.length)) s += target[s.length]
  return s
}

/** A sentence (two or more words) rather than a single word */
export const isSentence = (target: string) => (target.match(/\S+/g) ?? []).filter(w => /\p{L}/u.test(w)).length > 1

export type ChallengeRound = 1 | 2 | 3

/** Round names: in round 2 a sentence hides whole words, a single word hides letters */
export function roundLabelKey(round: ChallengeRound, target: string) {
  return round === 1 ? 'round_full' : round === 3 ? 'round_blind' : isSentence(target) ? 'round_half_words' : 'round_half_letters'
}

export function textHash(text: string): number {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Positions shown as a hint (the rest appear as dots). Punctuation and spaces always show. */
export function buildHintSet(target: string, round: ChallengeRound): Set<number> {
  const s = new Set<number>()
  if (round === 1) return s // all chars shown as MonkeyType pending
  target.split('').forEach((ch, i) => { if (isSpace(ch) || SKIPPABLE.test(ch)) s.add(i) })
  if (round === 3) { s.add(0); return s }
  if (isSentence(target)) {
    // Round 2 of a sentence: every other word hidden completely, the rest shown in full
    let n = textHash(target) % 2
    for (const m of target.matchAll(/\S+/g)) {
      if (!/\p{L}/u.test(m[0])) continue
      if (n++ % 2 === 0) for (let k = 0; k < m[0].length; k++) s.add(m.index + k)
    }
  } else {
    target.split('').forEach((_, i) => { if (i % 2 === 0) s.add(i) })
  }
  return s
}

export type ChallengeSession = { index: number; total: number; onSkip: () => void }

export function WordChallengeModal({ word, translation, promptLabel, onClose, onMastered, onComplete, session }: {
  word: string
  translation: string
  promptLabel?: string
  onClose: () => void
  onMastered?: () => void
  /** Called after the third round instead of onClose (used by practice sessions) */
  onComplete?: () => void
  session?: ChallengeSession
}) {
  const t = useTranslations('lesson')
  const locale = useLocale()
  const { languageCode } = useActiveLanguage()
  const courseLanguage = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }).of(languageCode) ?? languageCode,
    [locale, languageCode],
  )
  const [round, setRound]         = useState<ChallengeRound>(1)
  const [stars, setStars]         = useState(0)
  const [typed, setTyped]         = useState(() => autoAdvance('', word))
  const [shake, setShake]         = useState(false)
  const [roundDone, setRoundDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Set after an «o» typed for œ: the «e» that follows is skipped
  const pendingOe = useRef(false)

  const target  = word
  const hintSet = useMemo(() => buildHintSet(target, round), [target, round])

  // Focus input on mount + round change
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [round])

  // Escape to close, Enter to advance when round is done
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && roundDone) advanceRound()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, roundDone, round])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (roundDone || e.key !== 'Backspace') return
    e.preventDefault() // deletion is handled entirely below, not via native input diffing
    pendingOe.current = false
    setTyped(t => {
      if (t.length === 0) return t
      let newLen = t.length - 1
      while (newLen > 0 && isAutoChar(target, newLen - 1)) newLen--
      if (inputRef.current) inputRef.current.value = t.slice(0, newLen)
      return t.slice(0, newLen)
    })
  }, [roundDone, target])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (roundDone) return
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
    if (next.length === target.length) {
      setRoundDone(true)
      setStars(s => s + 1)
    }
  }, [roundDone, target, typed])

  const advanceRound = () => {
    if (round === 3) { onMastered?.(); (onComplete ?? onClose)(); return }
    setRound(r => (r + 1) as ChallengeRound)
    setTyped(autoAdvance('', target))
    setRoundDone(false)
  }

  // Build char display items
  const charItems = target.split('').map((ch, i) => {
    const isTyped  = i < typed.length
    const isCursor = i === typed.length
    const isHint   = hintSet.has(i)

    if (ch === ' ') return { display: '\u00A0', cls: 'w-4', isSpace: true }

    if (isTyped) {
      const ok = sameChar(typed[i], ch)
      return { display: ch, cls: ok ? 'text-lime-400' : 'text-red-400', isSpace: false }
    }

    if (round === 1) {
      return { display: ch, cls: isCursor ? 'text-white/70' : 'text-white/25', isSpace: false }
    }

    if (isHint) {
      return { display: ch, cls: isCursor ? 'text-white/70' : 'text-white/30', isSpace: false }
    }

    return { display: '·', cls: isCursor ? 'text-white/60' : 'text-white/20', isSpace: false }
  })

  // Group chars into word segments so a wrap never lands inside a word
  const wordGroups: { display: string; cls: string }[][] = []
  {
    let currentWord: { display: string; cls: string }[] = []
    for (const item of charItems) {
      if (item.isSpace) {
        if (currentWord.length) { wordGroups.push(currentWord); currentWord = [] }
      } else {
        currentWord.push(item)
      }
    }
    if (currentWord.length) wordGroups.push(currentWord)
  }

  const progress = typed.length / target.length

  // In a portal on <body>: the lists that open this modal sit inside animated cards, and a
  // transformed ancestor (e.g. the tap scale) would make `fixed` relative to the card and clip it
  return createPortal(
      <motion.div
        key="challenge-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto"
        style={{ background: 'rgba(5,14,0,0.92)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          key={round}
          initial={{ scale: 0.93, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 14 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="relative w-full max-w-md rounded-3xl p-8 flex flex-col items-center gap-5"
          style={{ background: '#0a1a05', border: '1px solid rgba(132,204,22,0.15)' }}
          onClick={() => { if (!roundDone) inputRef.current?.focus() }}
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/25 hover:text-white/60 transition-colors"
          >
            <X size={15} />
          </button>

          {/* Practice session: position + skip */}
          {session && (
            <div className="w-full flex items-center gap-3 -mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-lime-400/70 transition-all" style={{ width: `${(session.index / session.total) * 100}%` }} />
              </div>
              <span className="text-[11px] font-bold text-white/50 tabular-nums">
                {t('practice_word_of', { n: session.index + 1, total: session.total })}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); session.onSkip() }}
                className="text-[11px] font-bold text-lime-400/70 hover:text-lime-400 transition-colors mr-6"
              >
                {t('practice_skip')} →
              </button>
            </div>
          )}

          {/* Header: label + stars */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-2 text-lime-400/60 text-[10px] font-bold uppercase tracking-widest">
              <Zap size={10} />
              Word Challenge
            </div>
            {/* Stars */}
            <div className="flex items-center gap-2">
              {([1, 2, 3] as ChallengeRound[]).map(s => (
                <motion.span
                  key={s}
                  animate={stars >= s
                    ? { scale: [1, 1.5, 1] }
                    : { scale: 1 }
                  }
                  transition={{ duration: 0.4 }}
                >
                  <Star
                    size={22}
                    className={cn(
                      'transition-all',
                      stars >= s
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-transparent text-white/20',
                    )}
                  />
                </motion.span>
              ))}
            </div>
            {/* Round pill */}
            <div className="flex items-center gap-2">
              {([1, 2, 3] as ChallengeRound[]).map(r => (
                <div
                  key={r}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    r < round ? 'w-6 bg-lime-400' :
                    r === round ? 'w-10 bg-lime-400/80' : 'w-6 bg-white/15',
                  )}
                />
              ))}
            </div>
            <p className="text-white/35 text-[11px] font-semibold">
              {t('round_n', { n: round })} · {t(roundLabelKey(round, target))}
            </p>
          </div>

          {/* Prompt — context only, not what you type */}
          <div className="text-center">
            <p className="text-white/35 text-xs mb-1">{promptLabel ?? t('type_in', { language: courseLanguage })}</p>
            <p className="text-white text-xl font-bold">{translation}</p>
          </div>

          {/* Type-here indicator — makes it unambiguous which text below is the target */}
          <div className="flex items-center gap-1.5 text-lime-400/70 -mb-1">
            <Zap size={10} />
            <p className="text-[10px] font-bold uppercase tracking-widest">Type this</p>
          </div>

          {/* Word display — grouped by word so a line wrap never breaks a word */}
          <motion.div
            animate={shake ? { x: [0, -9, 9, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.38 }}
            className="flex gap-x-3 gap-y-1 flex-wrap justify-center min-h-[2.5rem] items-center"
          >
            {wordGroups.map((word, wi) => (
              <span key={wi} className="inline-flex gap-0.5">
                {word.map(({ display, cls }, ci) => (
                  <span key={ci} className={cn('text-3xl font-bold tracking-wide transition-colors duration-75', cls)}>
                    {display}
                  </span>
                ))}
              </span>
            ))}
          </motion.div>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', roundDone ? 'bg-lime-400' : 'bg-lime-400/50')}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.08 }}
            />
          </div>

          {/* Hidden input */}
          <input
            ref={inputRef}
            value={typed}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute pointer-events-none w-0 h-0"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* Bottom status */}
          <AnimatePresence mode="wait">
            {roundDone ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="text-lime-400 font-bold text-sm">
                  {round === 1 ? '⭐ Round 1 done!' : round === 2 ? '⭐⭐ Halfway there!' : '⭐⭐⭐ ¡Dominado!'}
                </p>
                <button
                  onClick={advanceRound}
                  className="px-7 py-2.5 rounded-2xl text-sm font-bold text-black hover:scale-105 active:scale-95 transition-all"
                  style={{ background: '#a3e635' }}
                >
                  {round < 3 ? `${t('next_round')} →` : t('done')}
                </button>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-white/20 text-xs"
              >
                {typed.length === 0 ? t('start_typing') : `${typed.length} / ${target.length}`}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    , document.body)
}
