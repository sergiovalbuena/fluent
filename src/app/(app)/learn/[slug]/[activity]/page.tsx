'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { motion, type MotionProps, AnimatePresence, usePresence, useAnimate } from 'framer-motion'
import {
  Volume2, ArrowRight, Check, X, RotateCcw,
  BookOpen, MessageSquare, HelpCircle, BookMarked, Shuffle, PenLine,
  Headphones, Keyboard, Bookmark, Zap, RotateCw, Star, Languages,
  GraduationCap, Lightbulb,
  type LucideIcon,
  LayoutList, FileText, ZoomIn, ZoomOut,
} from 'lucide-react'
import { useSavedItems, type SaveItem, type SavedItemType } from '@/hooks/use-saved-items'
import { useVocabMastery } from '@/hooks/use-vocab-mastery'
import Link from 'next/link'
import { AppTopbar } from '@/components/layout/app-topbar'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { localizeQuestion, pickTranslation, speak, splitArticle, type RawQuestion, type SpeechHandle } from '@/lib/languages'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { useLocale, useTranslations } from 'next-intl'
import { awardGems, getActiveBoosts } from '@/lib/rewards'
import { ResultScreen } from '@/components/lesson/result-screen'
import { WordSheet } from '@/components/lesson/word-sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabWord {
  word: string
  translation: string
  emoji: string
  example?: string
}

interface Phrase {
  phrase: string
  translation: string
}

interface QAQuestion {
  question: string
  options: string[]
  correct: number
  explanation?: string
}

interface ArrangeSentence {
  words: string[]
  translation: string
}

interface TranslateItem {
  prompt: string
  answer: string
  hint?: string
}

interface GrammarPoint {
  structure: string
  example: string
  /** What the structure is, in the translation language */
  label: string
}

interface LessonContent {
  words?: VocabWord[]
  grammar?: GrammarPoint[]
  tips?: string[]
  phrases?: Phrase[]
  questions?: QAQuestion[]
  story?: string
  storyTranslation?: string
  highlightedWords?: string[]
  arrangeSentences?: ArrangeSentence[]
  translateItems?: TranslateItem[]
}

type RawItem = {
  word?: string; translation?: string; translations?: Record<string, string>; icon?: string; example?: string
  phrase?: string; prompt?: string; answer?: string; hint?: string
}

interface RawContent {
  items?: RawItem[]
  // Some phrase lessons store their list under `phrases` instead of `items`
  phrases?: RawItem[]
  questions?: RawQuestion[]
  sentences?: Array<{ words: string[]; translation: string; translations?: Record<string, string> }>
  text?: string
  translation?: string
  translations?: Record<string, string>
  highlighted_words?: string[]
  // Vocabulary lessons of generated courses also carry the lesson's grammar and tips,
  // each text keyed by language ({ en, es })
  grammar?: Array<{ structure: string; example: string } & Record<string, string>>
  tips?: Array<Record<string, string>>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeContent(raw: RawContent, lessonType: string, translationLang: string): LessonContent {
  if (lessonType === 'vocabulary') {
    return {
      words: (raw.items ?? []).map(i => ({
        word: i.word ?? '',
        translation: pickTranslation(i, translationLang),
        emoji: i.icon ?? '📝',
        example: i.example,
      })),
      grammar: (raw.grammar ?? []).map(g => ({
        structure: g.structure,
        example: g.example,
        label: g[translationLang] ?? g.en ?? '',
      })),
      tips: (raw.tips ?? []).map(t => t[translationLang] ?? t.en ?? '').filter(Boolean),
    }
  }
  if (lessonType === 'phrases') {
    return {
      phrases: (raw.items ?? raw.phrases ?? []).map(i => ({
        phrase: i.phrase ?? '',
        translation: pickTranslation(i, translationLang),
      })),
    }
  }
  if (lessonType === 'qa') {
    return {
      questions: (raw.questions ?? []).map(q => localizeQuestion(q, translationLang)),
    }
  }
  if (lessonType === 'story') {
    return { story: raw.text, storyTranslation: pickTranslation(raw, translationLang), highlightedWords: raw.highlighted_words }
  }
  if (lessonType === 'arrange') {
    return {
      arrangeSentences: (raw.sentences ?? []).map(s => ({
        words: s.words,
        translation: pickTranslation(s, translationLang),
      })),
    }
  }
  if (lessonType === 'translate') {
    return {
      translateItems: (raw.items ?? []).map(i => ({
        // `translations` on a translate item holds the prompt in other languages
        prompt: i.translations?.[translationLang] ?? i.prompt ?? '',
        answer: i.answer ?? '',
        hint: i.hint,
      })),
    }
  }
  return {}
}

function fuzzyMatch(input: string, answer: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[¿¡.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  return normalize(input) === normalize(answer)
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Bento Block primitive ────────────────────────────────────────────────────
type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps

const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.5, y: 50, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1 },
    }}
    transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
    whileTap={{ scale: 0.97 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#202638]',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

// ─── Word Challenge Modal ─────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Punctuation the user shouldn't need to type — auto-inserted
const SKIPPABLE = /^[¿¡.,!?;:'"()\-–—…«»]+$/

function autoAdvance(current: string, target: string): string {
  let s = current
  while (s.length < target.length && SKIPPABLE.test(target[s.length])) {
    s += target[s.length]
  }
  return s
}

type ChallengeRound = 1 | 2 | 3

const ROUND_LABELS: Record<ChallengeRound, string> = {
  1: 'Full word',
  2: '50% hidden',
  3: 'Almost blind',
}

function buildHintSet(target: string, round: ChallengeRound): Set<number> {
  const s = new Set<number>()
  if (round === 1) return s // all chars shown as MonkeyType pending
  target.split('').forEach((ch, i) => {
    if (ch === ' ') { s.add(i); return }
    if (round === 2 && i % 2 === 0) s.add(i)
    if (round === 3 && i === 0) s.add(i)
  })
  return s
}

type ChallengeSession = { index: number; total: number; onSkip: () => void }

function WordChallengeModal({ word, translation, promptLabel, onClose, onMastered, onComplete, session }: {
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
    setTyped(t => {
      if (t.length === 0) return t
      let newLen = t.length - 1
      while (newLen > 0 && SKIPPABLE.test(target[newLen - 1])) newLen--
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

    // Validate every newly-inserted character in order — handles autocomplete,
    // IME composition, or paste inserting more than one character at once
    let next = typed
    const added = val.slice(typed.length)
    for (const ch of added) {
      if (next.length >= target.length) break
      if (norm(ch) === norm(target[next.length])) {
        next = autoAdvance(next + ch, target)
        continue
      }
      // Redundant punctuation the user typed that auto-advance already
      // inserted for them (e.g. a comma right before the cursor) — ignore it
      // instead of treating it as a mistake
      if (SKIPPABLE.test(ch) && next.length > 0 && norm(ch) === norm(target[next.length - 1])) {
        continue
      }
      setShake(true)
      setTimeout(() => setShake(false), 380)
      break
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
      const ok = norm(typed[i]) === norm(ch)
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

  return (
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
              Round {round} · {ROUND_LABELS[round]}
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
                  {round < 3 ? 'Next Round →' : 'Done!'}
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
                {typed.length === 0 ? 'Start typing…' : `${typed.length} / ${target.length}`}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
  )
}

// ─── Story Challenge Modal ────────────────────────────────────────────────────

function splitStory(text: string): string[] {
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

function StoryChallengeModal({ storyText, languageCode, onClose }: {
  storyText: string
  languageCode: string
  onClose: () => void
}) {
  const phrases   = useMemo(() => splitStory(storyText), [storyText])
  const [round, setRound]           = useState<ChallengeRound>(1)
  const [phraseIdx, setPhraseIdx]   = useState(0)
  const [typed, setTyped]           = useState(() => autoAdvance('', splitStory(storyText)[0] ?? ''))
  const [shake, setShake]           = useState(false)
  const [phraseDone, setPhraseDone] = useState(false)
  const [stars, setStars]           = useState(0)
  const [allDone, setAllDone]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setTyped(t => {
      if (t.length === 0) return t
      let newLen = t.length - 1
      while (newLen > 0 && SKIPPABLE.test(target[newLen - 1])) newLen--
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

    // Validate every newly-inserted character in order — handles autocomplete,
    // IME composition, or paste inserting more than one character at once
    let next = typed
    const added = val.slice(typed.length)
    for (const ch of added) {
      if (next.length >= target.length) break
      if (norm(ch) === norm(target[next.length])) {
        next = autoAdvance(next + ch, target)
        continue
      }
      // Redundant punctuation the user typed that auto-advance already
      // inserted for them (e.g. a comma right before the cursor) — ignore it
      // instead of treating it as a mistake
      if (SKIPPABLE.test(ch) && next.length > 0 && norm(ch) === norm(target[next.length - 1])) {
        continue
      }
      setShake(true); setTimeout(() => setShake(false), 380); break
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
        const ok = norm(typed[i]) === norm(ch)
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
              Round {round} · {ROUND_LABELS[round]}
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
              <p className="text-lime-400 font-bold text-xl text-center">¡Historia dominada!</p>
              <p className="text-white/40 text-sm text-center">Typed every phrase across 3 rounds</p>
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
              <button
                onClick={() => speakWord(target, languageCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-semibold transition-all active:scale-95 -mb-2"
              >
                <Volume2 size={13} />
                Escuchar frase
              </button>

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
                      {phraseIdx < phrases.length - 1 ? '✓ ¡Correcto!' :
                        round === 1 ? '⭐ Round 1 done!' :
                        round === 2 ? '⭐⭐ Halfway there!' : '⭐⭐⭐ ¡Dominado!'}
                    </p>
                    <button
                      onClick={advancePhrase}
                      className="px-7 py-2.5 rounded-2xl text-sm font-bold text-black hover:scale-105 active:scale-95 transition-all"
                      style={{ background: '#a3e635' }}
                    >
                      {phraseIdx < phrases.length - 1 ? 'Siguiente →' : round < 3 ? 'Next Round →' : 'Done!'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-white/20 text-xs">
                    {typed.length === 0 ? 'Empieza a escribir…' : `${typed.length} / ${target.length} caracteres`}
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

// ─── Vocabulary Word List (VanishList-inspired) ───────────────────────────────

type VocabEntry = {
  id: string | number
  word: string
  translation: string
}

function speakWord(word: string, langCode: string) {
  speak(word, langCode)
}

function VocabRow({
  entry,
  bookmarked,
  onToggleBookmark,
  onChallenge,
  mastered,
  langCode,
}: {
  entry: VocabEntry
  bookmarked: boolean
  onToggleBookmark: (entry: VocabEntry) => void
  onChallenge: (entry: VocabEntry) => void
  mastered: boolean
  langCode: string
}) {
  const [speaking, setSpeaking] = useState(false)
  const [isPresent, safeToRemove] = usePresence()
  const [scope, animate] = useAnimate()

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSpeaking(true)
    speakWord(entry.word, langCode)
    setTimeout(() => setSpeaking(false), 1000)
  }

  useEffect(() => {
    if (!isPresent) {
      const exit = async () => {
        animate('span', { color: '#6ee7b7' }, { duration: 0.1 })
        await animate(scope.current, { scale: 1.02 }, { duration: 0.1 })
        await animate(scope.current, { opacity: 0, x: 20 }, { delay: 0.6, duration: 0.2 })
        safeToRemove()
      }
      exit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent])

  return (
    <motion.div
      ref={scope}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-primary/[0.03] dark:hover:bg-primary/[0.04] transition-colors group"
    >
      <span className="flex-1 font-semibold text-sm text-slate-900 dark:text-white transition-colors">
        {(() => {
          const parts = splitArticle(entry.word, langCode)
          if (!parts) return entry.word
          return (
            <>
              <span className="opacity-35 font-medium">{parts.article} </span>
              {parts.main}
            </>
          )
        })()}
      </span>
      <span className="text-sm transition-all shrink-0 text-slate-400 dark:text-slate-500 group-hover:opacity-0 group-hover:transition-none">
        {entry.translation}
      </span>
      <div className="shrink-0 flex items-center gap-1">
        {mastered && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            title="Mastered"
          >
            <Star size={13} className="fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />
          </motion.span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChallenge(entry) }}
          className="flex md:hidden md:group-hover:flex items-center gap-1 p-2 md:px-2.5 md:py-1 rounded-lg text-[11px] font-bold text-lime-600 dark:text-lime-400 bg-lime-500/10 hover:bg-lime-500/20 active:scale-95 transition-all"
        >
          <Zap size={10} />
          <span className="hidden md:inline">Challenge</span>
        </button>
      </div>
      <button
        type="button"
        onClick={handleSpeak}
        className="shrink-0 p-2 rounded-lg hover:bg-sky-500/10 active:scale-90 transition-all"
      >
        <Volume2
          size={14}
          className={cn(
            'transition-colors',
            speaking
              ? 'text-sky-400'
              : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400',
          )}
        />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleBookmark(entry) }}
        className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-primary/10 active:scale-90 transition-all"
      >
        <Bookmark
          size={15}
          className={cn(
            'transition-colors',
            bookmarked
              ? 'fill-primary text-primary'
              : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
          )}
        />
      </button>
    </motion.div>
  )
}

export type PracticeRequest = { mode: 'all' | 'resume'; key: number }

/** Runs the word challenge for each word in a row: every word, or only the ones not mastered yet */
function PracticeSession({ entries, mode, isMastered, markMastered, onEnd, promptLabel }: {
  entries: VocabEntry[]
  mode: PracticeRequest['mode']
  promptLabel?: string
  isMastered: (word: string) => boolean
  markMastered: (word: string) => void
  onEnd: () => void
}) {
  const t = useTranslations('lesson')
  // Snapshot of the queue when the session starts
  const [queue] = useState(() => mode === 'resume' ? entries.filter(e => !isMastered(e.word)) : entries)
  const [index, setIndex] = useState(0)
  const [masteredNow, setMasteredNow] = useState(0)

  function next(mastered: boolean) {
    const done = masteredNow + (mastered ? 1 : 0)
    setMasteredNow(done)
    if (index + 1 >= queue.length) {
      const total = entries.length
      const masteredTotal = entries.filter(e => isMastered(e.word)).length + (mastered && !isMastered(queue[index].word) ? 1 : 0)
      toast.success(t('practice_done', { done: masteredTotal, total }))
      onEnd()
      return
    }
    setIndex(i => i + 1)
  }

  const entry = queue[index]
  if (!entry) return null
  return (
    <WordChallengeModal
      key={entry.id}
      word={entry.word}
      translation={entry.translation}
      promptLabel={promptLabel}
      session={{ index, total: queue.length, onSkip: () => next(false) }}
      onClose={onEnd}
      onMastered={() => markMastered(entry.word)}
      onComplete={() => next(true)}
    />
  )
}

function VocabWordList({
  initialWords,
  isSaved,
  onToggleBookmark,
  languageCode,
  onMasteredCountChange,
  practice,
  onPracticeEnd,
}: {
  initialWords: VocabEntry[]
  isSaved: (type: SavedItemType, original: string) => boolean
  onToggleBookmark: (item: SaveItem) => void
  languageCode: string
  onMasteredCountChange?: (count: number) => void
  practice?: PracticeRequest | null
  onPracticeEnd?: () => void
}) {
  const [entries] = useState<VocabEntry[]>(initialWords)
  const [challengeEntry, setChallengeEntry] = useState<VocabEntry | null>(null)

  const { isMastered, markMastered } = useVocabMastery(languageCode)
  // Mastery is stored per language; only count this lesson's words
  const masteredCount = entries.filter(e => isMastered(e.word)).length

  // Notify parent when count changes — outside setState, safe
  useEffect(() => {
    onMasteredCountChange?.(masteredCount)
  }, [masteredCount, onMasteredCountChange])

  const handleMastered = useCallback((word: string) => {
    markMastered(word)
  }, [markMastered])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Word List</p>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
            {masteredCount} / {entries.length} mastered
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence initial={false}>
          {entries.map(entry => (
            <VocabRow
              key={entry.id}
              entry={entry}
              bookmarked={isSaved('word', entry.word)}
              onToggleBookmark={(e) => onToggleBookmark({ type: 'word', original: e.word, translation: e.translation, languageCode: '' })}
              onChallenge={setChallengeEntry}
              mastered={isMastered(entry.word)}
              langCode={languageCode}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Challenge modal */}
      <AnimatePresence>
        {challengeEntry && (
          <WordChallengeModal
            key="word-challenge"
            word={challengeEntry.word}
            translation={challengeEntry.translation}
            onClose={() => setChallengeEntry(null)}
            onMastered={() => handleMastered(challengeEntry.word)}
          />
        )}
        {practice && (
          <PracticeSession
            key={`practice-${practice.key}`}
            entries={entries}
            mode={practice.mode}
            isMastered={isMastered}
            markMastered={markMastered}
            onEnd={() => onPracticeEnd?.()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Q&A Question List ────────────────────────────────────────────────────────

function QAQuestionList({
  questions,
  onStartQuiz,
  isSaved,
  onToggleBookmark,
  languageCode,
  onMasteredCountChange,
  practice,
  onPracticeEnd,
}: {
  questions: QAQuestion[]
  onStartQuiz: () => void
  isSaved: (type: SavedItemType, original: string) => boolean
  onToggleBookmark: (item: SaveItem) => void
  languageCode: string
  onMasteredCountChange?: (count: number) => void
  practice?: PracticeRequest | null
  onPracticeEnd?: () => void
}) {
  const [challengeQ, setChallengeQ] = useState<QAQuestion | null>(null)
  const { isMastered, markMastered } = useVocabMastery(languageCode, 'qa')
  const masteredCount = questions.filter(q => isMastered(q.question)).length

  useEffect(() => {
    onMasteredCountChange?.(masteredCount)
  }, [masteredCount, onMasteredCountChange])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Questions</p>
        <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
          {questions.length} questions
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {questions.map((q, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-purple-500/[0.03] dark:hover:bg-purple-500/[0.04] transition-colors group"
          >
            <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 w-5 shrink-0 tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{q.question}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 group-hover:opacity-0 group-hover:transition-none transition-all">
                {q.options[q.correct]}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {isMastered(q.question) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  title="Mastered"
                >
                  <Star size={13} className="fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />
                </motion.span>
              )}
              <button
                type="button"
                onClick={() => setChallengeQ(q)}
                className="flex md:hidden md:group-hover:flex items-center gap-1 p-2 md:px-2.5 md:py-1 rounded-lg text-[11px] font-bold text-lime-600 dark:text-lime-400 bg-lime-500/10 hover:bg-lime-500/20 active:scale-95 transition-all"
              >
                <Zap size={10} />
                <span className="hidden md:inline">Challenge</span>
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speakWord(q.question, languageCode) }}
              className="shrink-0 p-2 rounded-lg hover:bg-sky-500/10 active:scale-90 transition-all"
            >
              <Volume2 size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark({ type: 'phrase', original: q.question, translation: q.options[q.correct], languageCode: '' })}
              className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-primary/10 active:scale-90 transition-all"
            >
              <Bookmark
                size={14}
                className={cn(
                  'transition-colors',
                  isSaved('phrase', q.question)
                    ? 'fill-primary text-primary'
                    : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
                )}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button
          onClick={onStartQuiz}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-purple-500 hover:text-purple-600 transition-colors"
        >
          <ArrowRight size={13} />
          Start quiz
        </button>
      </div>

      <AnimatePresence>
        {challengeQ && (
          <WordChallengeModal
            key="word-challenge"
            word={challengeQ.question}
            translation={challengeQ.options[challengeQ.correct]}
            promptLabel="Answer"
            onClose={() => setChallengeQ(null)}
            onMastered={() => markMastered(challengeQ.question)}
          />
        )}
        {practice && (
          <PracticeSession
            key={`practice-${practice.key}`}
            entries={questions.map((q, i) => ({ id: `${q.question}-${i}`, word: q.question, translation: q.options[q.correct] }))}
            mode={practice.mode}
            isMastered={isMastered}
            markMastered={markMastered}
            onEnd={() => onPracticeEnd?.()}
            promptLabel="Answer"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Phrase List ──────────────────────────────────────────────────────────────

function PhraseList({
  phrases,
  onPractice,
  isSaved,
  onToggleBookmark,
  languageCode,
  onMasteredCountChange,
  practice,
  onPracticeEnd,
}: {
  phrases: Phrase[]
  onPractice: () => void
  isSaved: (type: SavedItemType, original: string) => boolean
  onToggleBookmark: (item: SaveItem) => void
  languageCode: string
  onMasteredCountChange?: (count: number) => void
  practice?: PracticeRequest | null
  onPracticeEnd?: () => void
}) {
  const [challengePhrase, setChallengePhrase] = useState<Phrase | null>(null)
  const { isMastered, markMastered } = useVocabMastery(languageCode, 'phrase')
  const masteredCount = phrases.filter(p => isMastered(p.phrase)).length

  useEffect(() => {
    onMasteredCountChange?.(masteredCount)
  }, [masteredCount, onMasteredCountChange])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phrase List</p>
        <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
          {phrases.length} phrases
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {phrases.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-blue-500/[0.03] dark:hover:bg-blue-500/[0.04] transition-colors group"
          >
            <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 w-5 shrink-0 tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{p.phrase}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 group-hover:opacity-0 group-hover:transition-none transition-all">
                {p.translation}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {isMastered(p.phrase) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  title="Mastered"
                >
                  <Star size={13} className="fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />
                </motion.span>
              )}
              <button
                type="button"
                onClick={() => setChallengePhrase(p)}
                className="flex md:hidden md:group-hover:flex items-center gap-1 p-2 md:px-2.5 md:py-1 rounded-lg text-[11px] font-bold text-lime-600 dark:text-lime-400 bg-lime-500/10 hover:bg-lime-500/20 active:scale-95 transition-all"
              >
                <Zap size={10} />
                <span className="hidden md:inline">Challenge</span>
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speakWord(p.phrase, languageCode) }}
              className="shrink-0 p-2 rounded-lg hover:bg-sky-500/10 active:scale-90 transition-all"
            >
              <Volume2 size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark({ type: 'phrase', original: p.phrase, translation: p.translation, languageCode: '' })}
              className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-primary/10 active:scale-90 transition-all"
            >
              <Bookmark
                size={14}
                className={cn(
                  'transition-colors',
                  isSaved('phrase', p.phrase)
                    ? 'fill-primary text-primary'
                    : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Practice CTA */}
      <div className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button
          onClick={onPractice}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          <ArrowRight size={13} />
          Start practice
        </button>
      </div>

      <AnimatePresence>
        {challengePhrase && (
          <WordChallengeModal
            key="word-challenge"
            word={challengePhrase.phrase}
            translation={challengePhrase.translation}
            onClose={() => setChallengePhrase(null)}
            onMastered={() => markMastered(challengePhrase.phrase)}
          />
        )}
        {practice && (
          <PracticeSession
            key={`practice-${practice.key}`}
            entries={phrases.map((p, i) => ({ id: `${p.phrase}-${i}`, word: p.phrase, translation: p.translation }))}
            mode={practice.mode}
            isMastered={isMastered}
            markMastered={markMastered}
            onEnd={() => onPracticeEnd?.()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const ACTIVITIES = [
  { key: 'vocabulary', label: 'Vocab',    Icon: BookOpen,      accent: '#ff8052', light: '#fff4f0' },
  { key: 'phrases',    label: 'Phrases',  Icon: MessageSquare, accent: '#3b82f6', light: '#eff6ff' },
  { key: 'qa',         label: 'Quiz',     Icon: HelpCircle,    accent: '#8b5cf6', light: '#f5f3ff' },
  { key: 'story',      label: 'Story',    Icon: BookMarked,    accent: '#10b981', light: '#ecfdf5' },
  { key: 'arrange',    label: 'Arrange',  Icon: Shuffle,       accent: '#f59e0b', light: '#fffbeb' },
  { key: 'translate',  label: 'Write',    Icon: PenLine,       accent: '#ec4899', light: '#fdf2f8' },
]

// Hoisted constants
const SHEET_ZOOM_MIN  = 0.8
const SHEET_ZOOM_MAX  = 1.6
const SHEET_ZOOM_STEP = 0.2
const COLOR_CORRECT            = '#22c55e'
const COLOR_INCORRECT          = '#ef4444'

// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <p className="text-muted-foreground text-center text-sm">{message}</p>
    </div>
  )
}

// ─── Activity Hero — full-width header, styled like the module hero ──────────

interface ActivityHeroTab {
  href: string
  icon: LucideIcon
  label: string
  iconColorClass: string
  iconBgClass: string
  barClass: string
  active?: boolean
}

/** The activity's main action, shown in the hero (start / continue / review) */
interface ActivityHeroCta {
  icon: LucideIcon
  label: string
  sublabel: string
  /** 0–1; omitted when the activity has no saved progress */
  progress?: number
  onClick: () => void
}

function ActivityHero({
  icon: Icon, iconColorClass, badgeLabel, badgeColorClass, title, cta, activities,
}: {
  icon: LucideIcon
  iconColorClass: string
  badgeLabel: string
  badgeColorClass: string
  /** Lesson name (or the story's name) shown under the activity badge */
  title?: string
  cta?: ActivityHeroCta
  activities: ActivityHeroTab[]
}) {
  return (
    <Block className="col-span-12 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-0">
      {/* Top: all 4 activities as tabs — the active one gets its colour bar and filled icon */}
      <div className="p-4 md:p-6 pb-4 md:pb-5">
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {activities.map(a => a.active ? (
            <div
              key={a.href}
              aria-current="page"
              className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none"
            >
              <div className={cn('h-[3px] w-full shrink-0', a.barClass)} />
              <div className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 flex-1">
                <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', a.barClass)}>
                  <a.icon size={18} className="text-white" />
                </div>
                <p className={cn('font-bold text-[13px] text-center', a.iconColorClass)}>{a.label}</p>
              </div>
            </div>
          ) : (
            <Link key={a.href} href={a.href} className="block group h-full">
              <motion.div
                whileHover={{ y: -4, scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 flex-1">
                  <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', a.iconBgClass)}>
                    <a.icon size={18} className={a.iconColorClass} />
                  </div>
                  <p className="font-bold text-[13px] text-center text-slate-400 dark:text-slate-500">{a.label}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-6 md:mx-8 h-px bg-black/[0.04] dark:bg-white/[0.05]" />

      {/* Bottom: activity badge (+ title when meaningful) and progress */}
      <div className="relative px-6 md:px-8 py-5 md:py-6">
        {/* Icon watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-40 md:w-56 flex items-center justify-end overflow-hidden pointer-events-none select-none">
          <Icon
            size={120}
            strokeWidth={1.5}
            className={cn('opacity-[0.06] dark:opacity-[0.05] translate-x-6 md:translate-x-10', iconColorClass)}
          />
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1>
              <span className={cn('inline-flex items-center text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full', badgeColorClass)}>
                {badgeLabel}
              </span>
              {title && (
                <span className="block mt-3 text-2xl md:text-[1.75rem] font-bold leading-tight text-slate-900 dark:text-white">
                  {title}
                </span>
              )}
            </h1>
          </div>

          {cta && (
            <motion.div
              whileHover={{ rotate: '1.5deg', scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="relative w-full sm:w-[340px] overflow-hidden rounded-2xl bg-primary p-4 shadow-[0_4px_0_rgba(0,0,0,0.08)]"
            >
              <cta.icon size={72} aria-hidden className="absolute -right-3 -bottom-4 text-white/10 rotate-12" />
              <button type="button" onClick={cta.onClick} className="relative flex w-full items-center gap-3 text-left">
                <span className="size-11 shrink-0 rounded-xl bg-white/20 flex items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.12)]">
                  <cta.icon size={20} className="text-white fill-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-bold text-white leading-tight">{cta.label}</span>
                  <span className="block text-xs text-white/75 mt-0.5">{cta.sublabel}</span>
                </span>
                <span className="size-9 shrink-0 rounded-full bg-white text-primary flex items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.12)]">
                  <ArrowRight size={17} strokeWidth={2.6} />
                </span>
              </button>
              {cta.progress != null && (
                <div className="relative mt-3 h-1.5 rounded-full bg-black/15 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${cta.progress * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Block>
  )
}

function CompletionCard({
  icon, title, subtitle, nextLabel, onNext, onRestart,
}: {
  icon: string; title: string; subtitle: string
  nextLabel: string; onNext: () => void; onRestart: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 w-full text-center py-10 px-6">
      <div className="text-7xl">{icon}</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onNext}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 bg-primary text-white text-base font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25"
        >
          {nextLabel} <ArrowRight size={16} />
        </button>
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold active:scale-95 transition-transform"
        >
          <RotateCcw size={13} /> Practice again
        </button>
      </div>
    </div>
  )
}

// ─── Points & Progression v1 ──────────────────────────────────────────────────

// Skills awarded per lesson activity type
const SKILL_MAP: Record<string, Partial<Record<'speaking' | 'vocabulary' | 'listening' | 'grammar', number>>> = {
  vocabulary: { vocabulary: 3 },
  phrases:    { vocabulary: 2, speaking: 1 },
  qa:         { grammar: 2, vocabulary: 1 },
  story:      { listening: 3, vocabulary: 1 },
  arrange:    { grammar: 3 },
  translate:  { grammar: 2, speaking: 1 },
}

// Stars based on score: ≥80 → 3★, ≥60 → 2★, else 1★
function calcStars(score: number): 1 | 2 | 3 {
  if (score >= 80) return 3
  if (score >= 60) return 2
  return 1
}

// Gems per activity: +1 for repeat, +2 for perfect score
function calcGems(score: number, isRepeat: boolean): number {
  let gems = 0
  if (isRepeat) gems += 1
  if (score === 100) gems += 2
  return gems
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const params  = useParams()
  const router  = useRouter()
  const slug     = params.slug     as string
  const activity = params.activity as string
  const { languageCode: activeLanguage, translationLang } = useActiveLanguage()

  const [lesson,       setLesson]       = useState<{ title: string; content: LessonContent } | null>(null)
  const [lessonId,     setLessonId]     = useState('')
  const [moduleId,     setModuleId]     = useState('')
  const [moduleTitle,  setModuleTitle]  = useState('')
  const [languageCode, setLanguageCode] = useState('')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)

  const { isSaved, toggle: toggleSaved } = useSavedItems(languageCode)

  // Result screen
  const [resultData, setResultData] = useState<{
    score: number
    xpEarned: number
    gemsEarned: number
    stars: 1 | 2 | 3
    milestoneBonusXp: number
  } | null>(null)

  // Vocabulary
  const [vocabIndex,     setVocabIndex]     = useState(0)
  const [vocabFlipped,   setVocabFlipped]   = useState(false)
  const [masteredCount,       setMasteredCount]       = useState(0)
  const [practice,            setPractice]            = useState<PracticeRequest | null>(null)
  const tLesson = useTranslations('lesson')
  const [masteredPhraseCount, setMasteredPhraseCount] = useState(0)
  const [masteredQACount,     setMasteredQACount]     = useState(0)
  const [phrasePractice,      setPhrasePractice]      = useState<PracticeRequest | null>(null)
  const [qaPractice,          setQaPractice]          = useState<PracticeRequest | null>(null)
  const [sheetZoom,           setSheetZoom]           = useState(1)

  /** Hero action for activities tracked by mastery: start → continue → review */
  function masteryCta(done: number, total: number, countLabel: string, start: (req: PracticeRequest) => void): ActivityHeroCta {
    const inProgress = done > 0 && done < total
    return {
      icon: Zap,
      label: done === 0 ? tLesson('practice_start') : inProgress ? tLesson('practice_resume') : tLesson('practice_review'),
      sublabel: done > 0 ? tLesson('practice_progress', { done, total }) : countLabel,
      progress: total > 0 ? done / total : 0,
      onClick: () => start({ mode: inProgress ? 'resume' : 'all', key: Date.now() }),
    }
  }

  // Phrases
  const [phraseMode,     setPhraseMode]     = useState<'overview' | 'practice'>('overview')
  const [phraseIndex,    setPhraseIndex]    = useState(0)
  const [phraseRevealed, setPhraseRevealed] = useState(false)
  const [phraseDone,     setPhraseDone]     = useState(false)

  // Q&A
  const [qaMode,       setQaMode]       = useState<'overview' | 'quiz'>('overview')
  const [qIndex,       setQIndex]       = useState(0)
  const [selected,     setSelected]     = useState<number | null>(null)
  const [checked,      setChecked]      = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [qaDone,       setQaDone]       = useState(false)

  // Story
  const [storyInput, setStoryInput]                   = useState('')
  const [showStoryChallenge, setShowStoryChallenge]   = useState(false)
  const [showTranslation, setShowTranslation]         = useState(false)
  const [audioStatus, setAudioStatus]                 = useState<'idle' | 'playing' | 'paused'>('idle')
  const storySpeechRef = useRef<SpeechHandle | null>(null)

  // Arrange
  const [arrangeIndex,      setArrangeIndex]      = useState(0)
  const [pickedIndices,     setPickedIndices]      = useState<number[]>([])
  const [arrangeChecked,    setArrangeChecked]    = useState(false)
  const [arrangeIsCorrect,  setArrangeIsCorrect]  = useState(false)
  const [arrangeCorrectCount, setArrangeCorrectCount] = useState(0)
  const [arrangeDone,       setArrangeDone]       = useState(false)

  // Translate
  const [translateIndex,        setTranslateIndex]        = useState(0)
  const [translateInput,        setTranslateInput]        = useState('')
  const [translateChecked,      setTranslateChecked]      = useState(false)
  const [translateIsCorrect,    setTranslateIsCorrect]    = useState(false)
  const [translateCorrectCount, setTranslateCorrectCount] = useState(0)
  const [translateDone,         setTranslateDone]         = useState(false)

  // Reset per-activity state on route change
  useEffect(() => {
    setVocabIndex(0); setVocabFlipped(false)
    setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false)
    setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false)
    setStoryInput('')
    setArrangeIndex(0); setPickedIndices([]); setArrangeChecked(false); setArrangeIsCorrect(false); setArrangeCorrectCount(0); setArrangeDone(false)
    setTranslateIndex(0); setTranslateInput(''); setTranslateChecked(false); setTranslateIsCorrect(false); setTranslateCorrectCount(0); setTranslateDone(false)
    setResultData(null)
  }, [activity])

  // Reset arrange word selection when sentence changes
  useEffect(() => {
    setPickedIndices([])
    setArrangeChecked(false)
    setArrangeIsCorrect(false)
  }, [arrangeIndex])

  // Reset translate input when item changes
  useEffect(() => {
    setTranslateInput('')
    setTranslateChecked(false)
    setTranslateIsCorrect(false)
  }, [translateIndex])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const { data: mod } = await supabase
        .from('modules')
        .select('id, language_code, title')
        .eq('slug', slug)
        .eq('language_code', activeLanguage)
        .limit(1)
        .maybeSingle()

      if (!mod) { setLoading(false); return }
      setLanguageCode(mod.language_code)
      setModuleTitle(mod.title)

      const { data } = await supabase
        .from('lessons')
        .select('id, title, type, content, module_id')
        .eq('module_id', mod.id)
        .eq('type', activity)
        .maybeSingle()

      if (data) {
        setLesson({ title: data.title, content: normalizeContent(data.content as RawContent, data.type, translationLang) })
        setLessonId(data.id)
        setModuleId(data.module_id)
      }
      setLoading(false)
    }
    load()
  }, [slug, activity, activeLanguage, translationLang])

  // Vocabulary counts as completed once every word in the lesson is mastered
  // (opening the page alone must not award progress)
  const vocabSavedRef = useRef(false)
  const vocabWordCount = activity === 'vocabulary' ? (lesson?.content.words?.length ?? 0) : 0
  useEffect(() => {
    if (!lessonId || vocabSavedRef.current) return
    if (vocabWordCount === 0 || masteredCount < vocabWordCount) return
    vocabSavedRef.current = true
    saveProgress(100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, vocabWordCount, masteredCount])

  // ── DB helpers ────────────────────────────────────────────────────────────

  async function saveProgress(score: number): Promise<{ stars: 1 | 2 | 3; gems: number; isFirstCompletion: boolean }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const fallbackStars = calcStars(score)
    if (!user || !lessonId || !moduleId) {
      console.warn('[saveProgress] skipped — missing context', { hasUser: !!user, lessonId, moduleId })
      return { stars: fallbackStars, gems: calcGems(score, false), isFirstCompletion: true }
    }

    const { data: existing } = await supabase
      .from('user_progress')
      .select('attempts, stars, best_score, activities_completed, completed_at')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    const isRepeat          = (existing?.attempts ?? 0) > 0
    const isFirstCompletion = !existing?.completed_at
    const prevActivities    = existing?.activities_completed ?? []
    const updatedActivities = prevActivities.includes(activity)
      ? prevActivities
      : [...prevActivities, activity]

    const newStars  = calcStars(score)
    // Gems are credited by the database, which applies the 2× gems boost and daily cap
    const newGems  = await awardGems(supabase, calcGems(score, isRepeat), 'lesson_activity', lessonId)
    const finalStars = Math.max(newStars, existing?.stars ?? 0) as 1 | 2 | 3

    const { error: upsertError } = await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      module_id: moduleId,
      completed_at: new Date().toISOString(),
      score,
      best_score: Math.max(score, existing?.best_score ?? 0),
      stars: finalStars,
      gems_earned: newGems,
      activities_completed: updatedActivities,
      attempts: (existing?.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

    if (upsertError) {
      console.error('[saveProgress] upsert failed:', upsertError)
      toast.error('Could not save progress — ' + upsertError.message)
    }

    // Record session — any activity completion counts
    const activityDate = new Date().toISOString().split('T')[0]
    const { data: todayRow } = await supabase
      .from('user_activity')
      .select('lessons_completed, xp_earned')
      .eq('user_id', user.id)
      .eq('activity_date', activityDate)
      .maybeSingle()
    await supabase.from('user_activity').upsert({
      user_id:           user.id,
      activity_date:     activityDate,
      lessons_completed: (todayRow?.lessons_completed ?? 0) + 1,
      xp_earned:         todayRow?.xp_earned ?? 0,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'user_id,activity_date' })

    return { stars: finalStars, gems: newGems, isFirstCompletion }
  }

  async function updateXpAndStreak(
    score: number,
    gemsEarned: number,
    stars: 1 | 2 | 3,
    isFirstCompletion: boolean,
  ): Promise<{ xpEarned: number; gemsEarned: number; milestoneBonusXp: number }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { xpEarned: 10, gemsEarned, milestoneBonusXp: 0 }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_xp, streak_count, longest_streak, last_activity_date, last_streak_milestone, skills, streak_freezes')
      .eq('user_id', user.id)
      .maybeSingle()

    const today   = new Date().toISOString().split('T')[0]
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const isNewDay  = profile?.last_activity_date !== today
    const prevStreak = profile?.streak_count ?? 0
    // Only continue streak if last activity was yesterday; otherwise reset to 1 —
    // unless exactly one day was missed and a streak freeze can cover it
    const dayBefore = new Date(); dayBefore.setDate(dayBefore.getDate() - 2)
    const missedOneDay = profile?.last_activity_date === dayBefore.toISOString().split('T')[0]
    const frozen = isNewDay && missedOneDay && (profile?.streak_freezes ?? 0) > 0
      ? ((await supabase.rpc('use_streak_freeze')).data === true)
      : false
    if (frozen) toast.success(tLesson('streak_frozen'))
    const streakContinues = profile?.last_activity_date === yesterdayStr || frozen
    const newStreak = isNewDay
      ? (streakContinues || prevStreak === 0 ? prevStreak + 1 : 1)
      : prevStreak

    // XP formula v1
    let xpEarned = 10                          // core activity
    if (isFirstCompletion) xpEarned += 20      // lesson completion bonus
    if (stars === 3)       xpEarned += 10      // 3-star bonus
    if (isNewDay)          xpEarned += 5       // streak day bonus

    // Active boost (bought in the gem shop): 2× XP
    if ((await getActiveBoosts(supabase, user.id)).xp) xpEarned *= 2

    // Streak milestone bonuses (awarded once per milestone; reset when streak breaks)
    const lastMilestone  = profile?.last_streak_milestone ?? 0
    // If streak broke (reset to 1), reset milestone tracker too
    const milestoneBasis = (isNewDay && !streakContinues && prevStreak > 0) ? 0 : lastMilestone
    let milestoneBonusXp = 0
    let newMilestone     = milestoneBasis
    if      (newStreak >= 14 && milestoneBasis < 14) { milestoneBonusXp = 50; newMilestone = 14 }
    else if (newStreak >= 7  && milestoneBasis < 7)  { milestoneBonusXp = 20; newMilestone = 7  }
    else if (newStreak >= 3  && milestoneBasis < 3)  { milestoneBonusXp = 10; newMilestone = 3  }
    xpEarned += milestoneBonusXp

    // Skill gains
    const skillGains     = SKILL_MAP[activity] ?? {}
    const currentSkills  = (profile?.skills ?? { speaking: 0, vocabulary: 0, listening: 0, grammar: 0 }) as Record<string, number>
    const updatedSkills  = {
      speaking:   (currentSkills.speaking   ?? 0) + (skillGains.speaking   ?? 0),
      vocabulary: (currentSkills.vocabulary ?? 0) + (skillGains.vocabulary ?? 0),
      listening:  (currentSkills.listening  ?? 0) + (skillGains.listening  ?? 0),
      grammar:    (currentSkills.grammar    ?? 0) + (skillGains.grammar    ?? 0),
    }

    await supabase.from('user_profiles').update({
      total_xp:             (profile?.total_xp  ?? 0) + xpEarned,
      streak_count:          newStreak,
      longest_streak:        Math.max(newStreak, profile?.longest_streak ?? 0),
      last_activity_date:    today,
      last_streak_milestone: newMilestone,
      skills:                updatedSkills,
    }).eq('user_id', user.id)

    // Update xp_earned in user_activity (session count already recorded in saveProgress)
    const { data: existingActivity } = await supabase
      .from('user_activity')
      .select('xp_earned, lessons_completed')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .maybeSingle()
    await supabase.from('user_activity').upsert({
      user_id:           user.id,
      activity_date:     today,
      xp_earned:         (existingActivity?.xp_earned ?? 0) + xpEarned,
      lessons_completed: existingActivity?.lessons_completed ?? 1,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'user_id,activity_date' })

    return { xpEarned, gemsEarned, milestoneBonusXp }
  }

  async function handleFinishLesson(score = 100) {
    setSaving(true)
    const { stars, gems, isFirstCompletion } = await saveProgress(score)
    const { xpEarned, gemsEarned, milestoneBonusXp } = await updateXpAndStreak(score, gems, stars, isFirstCompletion)
    setResultData({ score, xpEarned, gemsEarned, stars, milestoneBonusXp })
    setSaving(false)
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dark-mode aware surface colors
  const surfaceBg      = isDark ? '#1e1a18' : '#ffffff'
  const borderDefault  = isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'
  const correctBg      = isDark ? 'rgba(34,197,94,0.14)'   : '#f0fdf4'
  const correctText    = isDark ? '#4ade80'                 : '#15803d'
  const incorrectBg    = isDark ? 'rgba(239,68,68,0.14)'   : '#fef2f2'
  const incorrectText  = isDark ? '#f87171'                 : '#b91c1c'

  const activityIdx  = ACTIVITIES.findIndex(a => a.key === activity)
  const currentMeta  = ACTIVITIES[activityIdx] ?? ACTIVITIES[0]
  const nextActivity = ACTIVITIES[activityIdx + 1] ?? null

  const nextHref  = nextActivity ? `/learn/${slug}/${nextActivity.key}` : `/learn/${slug}`
  const nextLabel = nextActivity ? nextActivity.label : 'Back to Module'

  // Saves progress and navigates to the next activity (for non-final activities)
  async function handleActivityComplete(score: number) {
    await saveProgress(score)
    router.push(nextHref)
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const content   = lesson?.content ?? {}
  const words     = content.words     ?? []
  const grammar   = content.grammar   ?? []
  const tips      = content.tips      ?? []
  const phrases   = content.phrases   ?? []
  const questions = content.questions ?? []
  const arrangeSentences = content.arrangeSentences ?? []
  const translateItems   = content.translateItems   ?? []

  const currentArrangeSentence = arrangeSentences[arrangeIndex]

  // Shuffled words for current arrange sentence (stable per sentence)
  const shuffledWords = useMemo<string[]>(() => {
    if (!currentArrangeSentence) return []
    return shuffleArray([...currentArrangeSentence.words])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangeIndex, arrangeSentences.length])

  const availableWords = shuffledWords.filter((_, i) => !pickedIndices.includes(i))
  const answerWords    = pickedIndices.map(i => shuffledWords[i])

  function checkArrangeAnswer() {
    const isCorrect = answerWords.join(' ') === currentArrangeSentence?.words.join(' ')
    setArrangeIsCorrect(isCorrect)
    setArrangeChecked(true)
    if (isCorrect) setArrangeCorrectCount(c => c + 1)
  }

  function advanceArrange() {
    if (arrangeIndex + 1 >= arrangeSentences.length) {
      setArrangeDone(true)
    } else {
      setArrangeIndex(i => i + 1)
    }
  }

  function checkTranslateAnswer() {
    const item = translateItems[translateIndex]
    if (!item) return
    const isCorrect = fuzzyMatch(translateInput, item.answer)
    setTranslateIsCorrect(isCorrect)
    setTranslateChecked(true)
    if (isCorrect) setTranslateCorrectCount(c => c + 1)
  }

  function advanceTranslate() {
    if (translateIndex + 1 >= translateItems.length) {
      setTranslateDone(true)
    } else {
      setTranslateIndex(i => i + 1)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f6f5] dark:bg-[#1b2030]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-14 rounded-3xl bg-primary/10 flex items-center justify-center">
            <BookOpen size={26} className="text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  // ── Result screen ──────────────────────────────────────────────────────────

  if (resultData) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppTopbar back={{ href: `/learn/${slug}`, label: lesson.title }} />
        <ResultScreen
          score={resultData.score}
          xpEarned={resultData.xpEarned}
          gemsEarned={resultData.gemsEarned}
          stars={resultData.stars}
          milestoneBonusXp={resultData.milestoneBonusXp}
          onContinue={() => router.push('/learn')}
          onRestart={() => {
            setResultData(null)
            setStoryInput('')
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#1b2030]">
      <AppTopbar back={{ href: `/learn/${slug}`, label: lesson.title }} />


      {/* ══════════════════════════════════════════════════════════════════════
          VOCABULARY
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'vocabulary' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          <motion.div
            initial="initial"
            animate="animate"
            transition={{ staggerChildren: 0.05 }}
            className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
          >

            <ActivityHero
              icon={BookOpen}
              iconColorClass="text-indigo-500"
              badgeLabel="Vocabulary"
              title={moduleTitle}
              badgeColorClass="text-indigo-500 bg-indigo-500/10"
              cta={masteryCta(masteredCount, words.length, tLesson('practice_words', { count: words.length }), setPractice)}
              activities={[
                { href: `/learn/${slug}/vocabulary`, icon: BookOpen, label: 'Vocab', iconColorClass: 'text-indigo-500', iconBgClass: 'bg-indigo-500/10', barClass: 'bg-indigo-500', active: true },
                { href: `/learn/${slug}/phrases`, icon: MessageSquare, label: 'Phrases', iconColorClass: 'text-teal-600 dark:text-teal-400', iconBgClass: 'bg-teal-500/10', barClass: 'bg-teal-500' },
                { href: `/learn/${slug}/qa`, icon: HelpCircle, label: 'Q&A', iconColorClass: 'text-violet-500', iconBgClass: 'bg-violet-500/10', barClass: 'bg-violet-500' },
                { href: `/learn/${slug}/story`, icon: BookMarked, label: 'Story', iconColorClass: 'text-amber-600 dark:text-amber-400', iconBgClass: 'bg-amber-500/10', barClass: 'bg-amber-500' },
              ]}
            />

            {/* ── WORD LIST — col-6 row-span-4, animated VanishList ────────── */}
            <Block whileTap={{}} className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
              <VocabWordList
                initialWords={words.map((w, i) => ({
                  id: `${w.word}-${i}`,
                  word: w.word,
                  translation: w.translation,
                }))}
                isSaved={isSaved}
                onToggleBookmark={(item) => toggleSaved({ ...item, languageCode })}
                languageCode={languageCode}
                onMasteredCountChange={setMasteredCount}
                practice={practice}
                onPracticeEnd={() => setPractice(null)}
              />
            </Block>

            {/* ── ALL WORDS — two versions to compare: dialog (A) vs. own page (B) ── */}
            <Dialog>
              <Block
                whileHover={{ rotate: '-1.5deg', scale: 1.03 }}
                className="col-span-6 md:col-span-3 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              >
                <DialogTrigger className="flex h-full w-full items-center gap-3 p-4 text-left">
                  <span className="size-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <LayoutList size={18} className="text-indigo-500" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">All words</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">Quick view</span>
                  </span>
                </DialogTrigger>
              </Block>
              <DialogContent
                className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-5 md:p-6"
                style={{ maxWidth: `min(calc(100% - 2rem), ${512 * sheetZoom}px)` }}
              >
                <DialogHeader className="flex-row items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <DialogTitle className="font-bold leading-tight" style={{ fontSize: 20 * sheetZoom }}>{moduleTitle}</DialogTitle>
                    <DialogDescription className="mt-1">{words.length} words</DialogDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Zoom out"
                      disabled={sheetZoom <= SHEET_ZOOM_MIN}
                      onClick={() => setSheetZoom(z => Math.max(SHEET_ZOOM_MIN, +(z - SHEET_ZOOM_STEP).toFixed(2)))}
                      className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Zoom in"
                      disabled={sheetZoom >= SHEET_ZOOM_MAX}
                      onClick={() => setSheetZoom(z => Math.min(SHEET_ZOOM_MAX, +(z + SHEET_ZOOM_STEP).toFixed(2)))}
                      className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </DialogHeader>
                <WordSheet words={words} zoom={sheetZoom} className="columns-2 lg:columns-2 gap-x-6" />
              </DialogContent>
            </Dialog>

            <Block
              whileHover={{ rotate: '1.5deg', scale: 1.03 }}
              className="col-span-6 md:col-span-3 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            >
              <Link href={`/learn/${slug}/words`} className="flex h-full w-full items-center gap-3 p-4">
                <span className="size-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <FileText size={18} className="text-indigo-500" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Word sheet</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Full page</span>
                </span>
              </Link>
            </Block>

            {/* ── GRAMMAR — structures used in this lesson ───────────────────── */}
            {grammar.length > 0 && (
              <Block whileTap={{}} className="col-span-12 md:col-span-6 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center gap-2">
                  <GraduationCap size={14} className="text-indigo-500" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grammar</p>
                </div>
                <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                  {grammar.map((g, i) => (
                    <li key={i} className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{g.label}</p>
                      <p className="text-[11px] text-indigo-500 mt-0.5">{g.structure}</p>
                      <button
                        type="button"
                        onClick={() => speak(g.example, languageCode)}
                        className="mt-1.5 flex items-start gap-1.5 text-left text-sm italic text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors"
                      >
                        <Volume2 size={13} className="shrink-0 mt-[3px]" />
                        {g.example}
                      </button>
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {/* ── TIPS ─────────────────────────────────────────────────────────── */}
            {tips.length > 0 && (
              <Block whileTap={{}} className="col-span-12 md:col-span-6 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-500" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tips</p>
                </div>
                <ul className="px-5 py-3 space-y-2.5">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-amber-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PHRASES
      ══════════════════════════════════════════════════════════════════════ */}
      {/* ── PHRASES — BENTO OVERVIEW ─────────────────────────────────────── */}
      {activity === 'phrases' && phraseMode === 'overview' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          {phrases.length === 0 ? (
            <EmptyState message="No phrases in this lesson." />
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              transition={{ staggerChildren: 0.05 }}
              className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
            >
              <ActivityHero
                icon={MessageSquare}
                iconColorClass="text-teal-600 dark:text-teal-400"
                badgeLabel="Phrases"
                title={moduleTitle}
                badgeColorClass="text-teal-600 dark:text-teal-400 bg-teal-500/10"
                cta={masteryCta(masteredPhraseCount, phrases.length, tLesson('practice_phrases', { count: phrases.length }), setPhrasePractice)}
                activities={[
                  { href: `/learn/${slug}/vocabulary`, icon: BookOpen, label: 'Vocab', iconColorClass: 'text-indigo-500', iconBgClass: 'bg-indigo-500/10', barClass: 'bg-indigo-500' },
                  { href: `/learn/${slug}/phrases`, icon: MessageSquare, label: 'Phrases', iconColorClass: 'text-teal-600 dark:text-teal-400', iconBgClass: 'bg-teal-500/10', barClass: 'bg-teal-500', active: true },
                  { href: `/learn/${slug}/qa`, icon: HelpCircle, label: 'Q&A', iconColorClass: 'text-violet-500', iconBgClass: 'bg-violet-500/10', barClass: 'bg-violet-500' },
                  { href: `/learn/${slug}/story`, icon: BookMarked, label: 'Story', iconColorClass: 'text-amber-600 dark:text-amber-400', iconBgClass: 'bg-amber-500/10', barClass: 'bg-amber-500' },
                ]}
              />

              {/* Phrase list */}
              <Block whileTap={{}} className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
                <PhraseList
                  phrases={phrases}
                  onPractice={() => { setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false); setPhraseMode('practice') }}
                  isSaved={isSaved}
                  onToggleBookmark={(item) => toggleSaved({ ...item, languageCode })}
                  languageCode={languageCode}
                  onMasteredCountChange={setMasteredPhraseCount}
                  practice={phrasePractice}
                  onPracticeEnd={() => setPhrasePractice(null)}
                />
              </Block>

              {/* Practice */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-blue-500 dark:bg-blue-600 border-blue-400/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => { setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false); setPhraseMode('practice') }}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <MessageSquare size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Practice</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Flip &amp; review</p>
                  </div>
                </button>
              </Block>

              {/* Listening */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => toast.info('Listening Challenge — coming soon!')}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <Headphones size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Listening</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Hear &amp; identify</p>
                  </div>
                </button>
              </Block>

            </motion.div>
          )}
        </div>
      )}

      {/* ── PHRASES — PRACTICE MODE ──────────────────────────────────────────── */}
      {activity === 'phrases' && phraseMode === 'practice' && (
        <div className="flex-1 flex flex-col items-center p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {phraseDone ? (
            <CompletionCard
              icon="💬"
              title="All phrases reviewed!"
              subtitle={`${phrases.length} phrases practiced`}
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(100)}
              onRestart={() => { setPhraseIndex(0); setPhraseRevealed(false); setPhraseDone(false) }}
            />
          ) : (
            <>
              {/* Back + progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setPhraseMode('overview')}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-blue-500 transition-colors flex items-center gap-1"
                  >
                    ← Phrases
                  </button>
                  <span className="text-[11px] font-bold text-blue-500">
                    {phraseIndex + 1} / {phrases.length}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-blue-500/20">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-blue-500"
                    style={{ width: `${(phraseIndex / phrases.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Phrase card */}
              <div
                className="w-full flex-1 max-h-72 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-5 p-8 text-center select-none cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: phraseRevealed ? '#3b82f614' : surfaceBg,
                  border: `1.5px solid ${phraseRevealed ? '#3b82f645' : borderDefault}`,
                }}
                onClick={() => !phraseRevealed && setPhraseRevealed(true)}
              >
                <p className="text-2xl md:text-3xl font-bold leading-snug">{phrases[phraseIndex].phrase}</p>
                {!phraseRevealed ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RotateCcw size={10} />
                    <span>tap for translation</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-semibold text-blue-500">
                      {phrases[phraseIndex].translation}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); toast.info('Audio coming soon') }}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div
                className="w-full transition-all duration-300"
                style={{ opacity: phraseRevealed ? 1 : 0, pointerEvents: phraseRevealed ? 'auto' : 'none' }}
              >
                <button
                  onClick={() => {
                    if (phraseIndex + 1 >= phrases.length) setPhraseDone(true)
                    else { setPhraseIndex(i => i + 1); setPhraseRevealed(false) }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform bg-blue-500"
                  style={{ boxShadow: '0 8px 24px #3b82f635' }}
                >
                  {phraseIndex + 1 >= phrases.length ? 'All done!' : 'Next phrase'} <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Q&A — BENTO OVERVIEW ─────────────────────────────────────────────── */}
      {activity === 'qa' && qaMode === 'overview' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          {questions.length === 0 ? (
            <EmptyState message="No questions in this lesson." />
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              transition={{ staggerChildren: 0.05 }}
              className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
            >
              <ActivityHero
                icon={HelpCircle}
                iconColorClass="text-violet-500"
                badgeLabel="Q&A"
                title={moduleTitle}
                badgeColorClass="text-violet-500 bg-violet-500/10"
                cta={masteryCta(masteredQACount, questions.length, tLesson('practice_questions', { count: questions.length }), setQaPractice)}
                activities={[
                  { href: `/learn/${slug}/vocabulary`, icon: BookOpen, label: 'Vocab', iconColorClass: 'text-indigo-500', iconBgClass: 'bg-indigo-500/10', barClass: 'bg-indigo-500' },
                  { href: `/learn/${slug}/phrases`, icon: MessageSquare, label: 'Phrases', iconColorClass: 'text-teal-600 dark:text-teal-400', iconBgClass: 'bg-teal-500/10', barClass: 'bg-teal-500' },
                  { href: `/learn/${slug}/qa`, icon: HelpCircle, label: 'Q&A', iconColorClass: 'text-violet-500', iconBgClass: 'bg-violet-500/10', barClass: 'bg-violet-500', active: true },
                  { href: `/learn/${slug}/story`, icon: BookMarked, label: 'Story', iconColorClass: 'text-amber-600 dark:text-amber-400', iconBgClass: 'bg-amber-500/10', barClass: 'bg-amber-500' },
                ]}
              />

              {/* Questions list */}
              <Block className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
                <QAQuestionList
                  questions={questions}
                  onStartQuiz={() => { setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false); setQaMode('quiz') }}
                  isSaved={isSaved}
                  onToggleBookmark={(item) => toggleSaved({ ...item, languageCode })}
                  languageCode={languageCode}
                  onMasteredCountChange={setMasteredQACount}
                  practice={qaPractice}
                  onPracticeEnd={() => setQaPractice(null)}
                />
              </Block>

              {/* Start Quiz */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-purple-600 dark:bg-purple-700 border-purple-500/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => { setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false); setQaMode('quiz') }}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <HelpCircle size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Start Quiz</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Test yourself</p>
                  </div>
                </button>
              </Block>

              {/* Listening */}
              <Block
                whileHover={{ rotate: '-2.5deg', scale: 1.07 }}
                className="col-span-6 md:col-span-3 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[140px]"
              >
                <button
                  onClick={() => toast.info('Listening Challenge — coming soon!')}
                  className="grid h-full place-content-center gap-3 p-5 min-h-[140px] w-full"
                >
                  <Headphones size={28} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Listening</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Hear &amp; identify</p>
                  </div>
                </button>
              </Block>

            </motion.div>
          )}
        </div>
      )}

      {/* ── Q&A — QUIZ MODE ──────────────────────────────────────────────────── */}
      {activity === 'qa' && qaMode === 'quiz' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-4 max-w-lg mx-auto w-full">
          {qaDone ? (
            <CompletionCard
              icon={correctCount === questions.length ? '🏆' : correctCount >= Math.ceil(questions.length / 2) ? '⭐' : '💪'}
              title={correctCount === questions.length ? 'Perfect score!' : `${correctCount} / ${questions.length} correct`}
              subtitle={correctCount === questions.length ? 'You nailed every question!' : 'Keep going — practice makes perfect.'}
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(Math.round((correctCount / questions.length) * 100))}
              onRestart={() => { setQIndex(0); setSelected(null); setChecked(false); setCorrectCount(0); setQaDone(false) }}
            />
          ) : (
            <>
              {/* Back + progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setQaMode('overview')}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-purple-500 transition-colors flex items-center gap-1"
                  >
                    ← Q&amp;A
                  </button>
                  <span className="text-[11px] font-bold text-purple-500">
                    {qIndex + 1} / {questions.length} · {correctCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-purple-500/20">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-purple-500"
                    style={{ width: `${(qIndex / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-3xl p-5 border shadow-sm bg-purple-500/10 border-purple-500/25">
                <p className="text-base md:text-lg font-bold leading-snug">{questions[qIndex].question}</p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2.5 flex-1">
                {questions[qIndex].options.map((option, i) => {
                  const isSelected = selected === i
                  const isCorrect  = i === questions[qIndex].correct
                  const show       = checked

                  let borderColor = borderDefault
                  let bgColor     = surfaceBg
                  let textColor   = 'inherit'
                  let badgeBg     = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'
                  let badgeColor  = isDark ? '#94a3b8' : '#94a3b8'

                  if (!show && isSelected) {
                    borderColor = '#8b5cf6'; bgColor = '#8b5cf614'
                    badgeBg = '#8b5cf6'; badgeColor = '#fff'
                  } else if (show && isCorrect) {
                    borderColor = COLOR_CORRECT; bgColor = correctBg; textColor = correctText
                    badgeBg = COLOR_CORRECT; badgeColor = '#fff'
                  } else if (show && isSelected && !isCorrect) {
                    borderColor = COLOR_INCORRECT; bgColor = incorrectBg; textColor = incorrectText
                    badgeBg = COLOR_INCORRECT; badgeColor = '#fff'
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !checked && setSelected(i)}
                      disabled={checked}
                      className="w-full text-left px-4 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all flex items-center gap-3 active:scale-[0.98]"
                      style={{ borderColor, backgroundColor: bgColor, color: textColor, opacity: show && !isSelected && !isCorrect ? 0.45 : 1 }}
                    >
                      <span
                        className="size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                      >
                        {show && isCorrect ? <Check size={13} /> : show && isSelected && !isCorrect ? <X size={13} /> : String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {checked && questions[qIndex].explanation && (
                <div className="rounded-2xl p-4 border text-sm leading-relaxed bg-purple-500/[0.08] border-purple-500/30 text-purple-600 dark:text-purple-400">
                  {questions[qIndex].explanation}
                </div>
              )}

              {/* CTA */}
              {!checked ? (
                <button
                  onClick={() => selected !== null && setChecked(true)}
                  disabled={selected === null}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 bg-purple-600"
                  style={{ boxShadow: selected !== null ? '0 8px 24px #8b5cf635' : 'none' }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={() => {
                    const correct = selected === questions[qIndex].correct
                    if (correct) setCorrectCount(c => c + 1)
                    if (qIndex + 1 >= questions.length) { setQaDone(true) }
                    else { setQIndex(i => i + 1); setSelected(null); setChecked(false) }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform"
                  style={{
                    backgroundColor: selected === questions[qIndex].correct ? COLOR_CORRECT : '#64748b',
                    boxShadow: selected === questions[qIndex].correct ? `0 8px 20px ${COLOR_CORRECT}30` : 'none',
                  }}
                >
                  {selected === questions[qIndex].correct ? '✓ Correct — ' : '✗ Incorrect — '}
                  {qIndex + 1 >= questions.length ? 'See results' : 'Next question'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STORY — BENTO
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'story' && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          {!content.story ? (
            <EmptyState message="No story in this lesson." />
          ) : (
            <motion.div
              initial="initial"
              animate="animate"
              transition={{ staggerChildren: 0.05 }}
              className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
            >
              <ActivityHero
                icon={BookMarked}
                iconColorClass="text-amber-600 dark:text-amber-400"
                badgeLabel="Story"
                badgeColorClass="text-amber-600 dark:text-amber-400 bg-amber-500/10"
                title={lesson.title}
                cta={{
                  icon: Zap,
                  label: tLesson('story_challenge_start'),
                  sublabel: tLesson('story_challenge_desc', { count: splitStory(content.story).length }),
                  onClick: () => setShowStoryChallenge(true),
                }}
                activities={[
                  { href: `/learn/${slug}/vocabulary`, icon: BookOpen, label: 'Vocab', iconColorClass: 'text-indigo-500', iconBgClass: 'bg-indigo-500/10', barClass: 'bg-indigo-500' },
                  { href: `/learn/${slug}/phrases`, icon: MessageSquare, label: 'Phrases', iconColorClass: 'text-teal-600 dark:text-teal-400', iconBgClass: 'bg-teal-500/10', barClass: 'bg-teal-500' },
                  { href: `/learn/${slug}/qa`, icon: HelpCircle, label: 'Q&A', iconColorClass: 'text-violet-500', iconBgClass: 'bg-violet-500/10', barClass: 'bg-violet-500' },
                  { href: `/learn/${slug}/story`, icon: BookMarked, label: 'Story', iconColorClass: 'text-amber-600 dark:text-amber-400', iconBgClass: 'bg-amber-500/10', barClass: 'bg-amber-500', active: true },
                ]}
              />

              {/* Story text — left col, row 2 */}
              {(() => {
                const storySentences      = splitStory(content.story ?? '')
                const translationSentences = content.storyTranslation ? splitStory(content.storyTranslation) : []
                const hw = content.highlightedWords ?? []
                const hwRegex = hw.length > 0
                  ? new RegExp(`(${hw.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
                  : null

                function playStory() {
                  setAudioStatus('playing')
                  storySpeechRef.current = speak(content.story ?? '', languageCode, { onEnd: () => setAudioStatus('idle') })
                }
                function pauseStory() {
                  storySpeechRef.current?.pause(); setAudioStatus('paused')
                }
                function resumeStory() {
                  storySpeechRef.current?.resume(); setAudioStatus('playing')
                }
                function stopStory() {
                  storySpeechRef.current?.stop(); setAudioStatus('idle')
                }

                return (
                  <Block className="col-span-12 md:col-span-6 md:col-start-1 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-primary/5 gap-2 flex-wrap">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Story</p>
                      <div className="flex items-center gap-1.5">
                        {/* Audio controls */}
                        {audioStatus === 'idle' && (
                          <button
                            onClick={playStory}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12 active:scale-95 transition-all"
                          >
                            <Volume2 size={10} />
                            Audio
                          </button>
                        )}
                        {audioStatus === 'playing' && (
                          <>
                            <button
                              onClick={pauseStory}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1.5" y="1" width="2.5" height="8" rx="1"/><rect x="6" y="1" width="2.5" height="8" rx="1"/></svg>
                              Pausa
                            </button>
                            <button
                              onClick={stopStory}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1.5"/></svg>
                              Stop
                            </button>
                          </>
                        )}
                        {audioStatus === 'paused' && (
                          <>
                            <button
                              onClick={resumeStory}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>
                              Reanudar
                            </button>
                            <button
                              onClick={stopStory}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1.5"/></svg>
                              Stop
                            </button>
                          </>
                        )}
                        {/* Translation toggle */}
                        <button
                          onClick={() => setShowTranslation(v => !v)}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold active:scale-95 transition-all',
                            showTranslation
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/15 hover:bg-blue-500/20'
                              : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12'
                          )}
                        >
                          <Languages size={10} />
                          Traducción
                        </button>
                        {/* Challenge */}
                        <button
                          onClick={() => setShowStoryChallenge(true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-lime-600 dark:text-lime-400 bg-lime-500/10 hover:bg-lime-500/20 active:scale-95 transition-all"
                        >
                          <Zap size={10} />
                          Challenge
                        </button>
                      </div>
                    </div>
                    {/* Sentence-by-sentence body */}
                    <div className="p-6 md:p-8 overflow-y-auto space-y-4" style={{ maxHeight: '32rem' }}>
                      {storySentences.map((sentence, si) => {
                        const tr = translationSentences[si]
                        const parts = hwRegex ? sentence.split(hwRegex) : [sentence]
                        return (
                          <div key={si}>
                            <p className="text-slate-800 dark:text-slate-100 text-base leading-relaxed font-medium">
                              {hwRegex
                                ? parts.map((part, pi) =>
                                    hw.some(w => w.toLowerCase() === part.toLowerCase())
                                      ? <span key={pi} className="text-emerald-600 dark:text-emerald-400 font-semibold">{part}</span>
                                      : <span key={pi}>{part}</span>
                                  )
                                : sentence
                              }
                            </p>
                            <AnimatePresence>
                              {showTranslation && tr && (
                                <motion.p
                                  key={`tr-${si}`}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="text-slate-400 dark:text-slate-500 text-sm mt-1 leading-relaxed italic overflow-hidden"
                                >
                                  {tr}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </Block>
                )
              })()}

              {/* Listening — right col, row 2 (grid-flow-dense backfills the gap) */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-4 md:col-span-6 bg-teal-500 dark:bg-teal-600 border-teal-400/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('Listening Challenge — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <Headphones size={26} className="text-white mx-auto" />
                  <div className="text-center">
                    <p className="font-bold text-sm text-white">Listening</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Hear the story</p>
                  </div>
                </button>
              </Block>

              {/* Key words — left col, row 3 */}
              {(content.highlightedWords?.length ?? 0) > 0 && (
                <Block className="col-span-12 md:col-span-6 md:col-start-1 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Key words</p>
                  <div className="flex flex-wrap gap-2">
                    {content.highlightedWords!.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSaved({ type: 'story_word', original: w, translation: '', languageCode, sourceLessonId: lessonId })}
                        className={cn(
                          'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95',
                          isSaved('story_word', w)
                            ? 'bg-primary/15 text-primary'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25'
                        )}
                      >
                        {w}
                        <Bookmark size={10} className={isSaved('story_word', w) ? 'fill-primary' : ''} />
                      </button>
                    ))}
                  </div>
                </Block>
              )}


              {/* Write your sentence — left col, row 4 */}
              <Block className="col-span-12 md:col-span-6 md:col-start-1 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Write your own sentence</p>
                <textarea
                  value={storyInput}
                  onChange={e => setStoryInput(e.target.value)}
                  placeholder="Try using one of the key words…"
                  className="w-full p-3 rounded-2xl border-2 border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-sm resize-none h-24 focus:outline-none focus:border-emerald-500/60 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </Block>

              {/* Type × 3 — right col, row 4 */}
              <Block
                whileHover={{ rotate: '2.5deg', scale: 1.07 }}
                className="col-span-4 md:col-span-6 bg-rose-500 dark:bg-rose-600 border-rose-400/20 p-0 min-h-[120px]"
              >
                <button
                  onClick={() => toast.info('Type × 3 — coming soon!')}
                  className="grid h-full place-content-center gap-2 p-5 min-h-[120px] w-full"
                >
                  <PenLine size={26} className="text-white mx-auto" />
                  <p className="font-bold text-xs text-white text-center">Type × 3</p>
                </button>
              </Block>

              {/* Story Challenge Modal */}
              {showStoryChallenge && content.story && (
                <StoryChallengeModal
                  storyText={content.story}
                  languageCode={languageCode}
                  onClose={() => setShowStoryChallenge(false)}
                />
              )}

              {/* Finish lesson */}
              <Block
                whileHover={{ scale: 1.015 }}
                className="col-span-12 p-0 overflow-hidden border-primary/20 min-h-[80px]"
                style={{ background: 'linear-gradient(135deg, #ff8052 0%, #ff5c2b 100%)' }}
              >
                <button
                  onClick={() => handleFinishLesson(100)}
                  disabled={saving}
                  className="w-full flex items-center justify-between gap-4 px-8 py-5 disabled:opacity-60"
                >
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">All done!</span>
                    <span className="text-xl font-bold text-white">{saving ? 'Saving…' : 'Finish Lesson 🎉'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold">
                      {[BookOpen, MessageSquare, HelpCircle, BookMarked].map((Icon, i) => (
                        <Icon key={i} size={14} className="text-white/80" />
                      ))}
                    </div>
                    <div className="shrink-0 size-10 rounded-full bg-white/15 flex items-center justify-center">
                      <Check size={18} className="text-white" />
                    </div>
                  </div>
                </button>
              </Block>
            </motion.div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ARRANGE — Build the sentence
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'arrange' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {arrangeSentences.length === 0 ? (
            <EmptyState message="No sentences in this lesson." />
          ) : arrangeDone ? (
            <CompletionCard
              icon={arrangeCorrectCount === arrangeSentences.length ? '🏆' : '⭐'}
              title={arrangeCorrectCount === arrangeSentences.length ? 'Perfect!' : `${arrangeCorrectCount} / ${arrangeSentences.length} correct`}
              subtitle="Sentence builder complete"
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(Math.round((arrangeCorrectCount / arrangeSentences.length) * 100))}
              onRestart={() => { setArrangeIndex(0); setPickedIndices([]); setArrangeChecked(false); setArrangeIsCorrect(false); setArrangeCorrectCount(0); setArrangeDone(false) }}
            />
          ) : (
            <>
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Sentence {arrangeIndex + 1} of {arrangeSentences.length}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {arrangeCorrectCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(arrangeIndex / arrangeSentences.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* Translation prompt */}
              <div
                className="rounded-2xl p-4 border text-center"
                style={{ backgroundColor: `${currentMeta.accent}0d`, borderColor: `${currentMeta.accent}30` }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: currentMeta.accent }}>
                  Translate
                </p>
                <p className="text-base font-semibold">{currentArrangeSentence?.translation}</p>
              </div>

              {/* Answer slots */}
              <div className="min-h-[52px] flex flex-wrap gap-2 p-3 rounded-2xl border-2 border-dashed transition-colors"
                style={{ borderColor: arrangeChecked ? (arrangeIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT) : `${currentMeta.accent}40` }}
              >
                {answerWords.length === 0 ? (
                  <p className="text-sm text-muted-foreground/50 self-center">Tap words below to build the sentence…</p>
                ) : (
                  answerWords.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => !arrangeChecked && setPickedIndices(p => p.filter((_, idx) => idx !== i))}
                      disabled={arrangeChecked}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                      style={{ backgroundColor: currentMeta.accent }}
                    >
                      {w}
                    </button>
                  ))
                )}
              </div>

              {/* Feedback */}
              {arrangeChecked && (
                <div
                  className="rounded-2xl p-3 border text-sm font-semibold text-center"
                  style={{
                    backgroundColor: arrangeIsCorrect ? correctBg : incorrectBg,
                    borderColor: arrangeIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT,
                    color: arrangeIsCorrect ? correctText : incorrectText,
                  }}
                >
                  {arrangeIsCorrect
                    ? '✓ Correct!'
                    : `✗ The answer was: "${currentArrangeSentence?.words.join(' ')}"`
                  }
                </div>
              )}

              {/* Available word chips */}
              <div className="flex flex-wrap gap-2">
                {shuffledWords.map((w, i) => {
                  const isPicked = pickedIndices.includes(i)
                  return (
                    <button
                      key={i}
                      onClick={() => !arrangeChecked && !isPicked && setPickedIndices(p => [...p, i])}
                      disabled={arrangeChecked || isPicked}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95"
                      style={{
                        borderColor: isPicked ? borderDefault : `${currentMeta.accent}60`,
                        backgroundColor: isPicked ? (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc') : surfaceBg,
                        color: isPicked ? (isDark ? '#475569' : '#cbd5e1') : 'inherit',
                        opacity: isPicked ? 0.4 : 1,
                      }}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>

              {/* CTA */}
              {!arrangeChecked ? (
                <button
                  onClick={checkArrangeAnswer}
                  disabled={answerWords.length === 0}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 mt-auto"
                  style={{ backgroundColor: currentMeta.accent }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={advanceArrange}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform mt-auto"
                  style={{
                    backgroundColor: arrangeIsCorrect ? COLOR_CORRECT : '#64748b',
                  }}
                >
                  {arrangeIndex + 1 >= arrangeSentences.length ? 'See results' : 'Next sentence'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TRANSLATE — Free text input
      ══════════════════════════════════════════════════════════════════════ */}
      {activity === 'translate' && (
        <div className="flex-1 flex flex-col p-5 md:p-8 gap-5 max-w-lg mx-auto w-full">
          {translateItems.length === 0 ? (
            <EmptyState message="No translation exercises in this lesson." />
          ) : translateDone ? (
            <CompletionCard
              icon={translateCorrectCount === translateItems.length ? '🏆' : '⭐'}
              title={translateCorrectCount === translateItems.length ? 'Perfect!' : `${translateCorrectCount} / ${translateItems.length} correct`}
              subtitle="Translation practice complete"
              nextLabel={nextLabel}
              onNext={() => handleActivityComplete(Math.round((translateCorrectCount / translateItems.length) * 100))}
              onRestart={() => { setTranslateIndex(0); setTranslateInput(''); setTranslateChecked(false); setTranslateIsCorrect(false); setTranslateCorrectCount(0); setTranslateDone(false) }}
            />
          ) : (
            <>
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {translateIndex + 1} / {translateItems.length}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: currentMeta.accent }}>
                    {translateCorrectCount} correct
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${currentMeta.accent}20` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(translateIndex / translateItems.length) * 100}%`, backgroundColor: currentMeta.accent }}
                  />
                </div>
              </div>

              {/* Prompt card */}
              <div
                className="rounded-3xl p-6 border shadow-sm text-center"
                style={{ backgroundColor: `${currentMeta.accent}10`, borderColor: `${currentMeta.accent}25` }}
              >
                <p className="text-xl md:text-2xl font-bold leading-snug">{translateItems[translateIndex].prompt}</p>
                {translateItems[translateIndex].hint && (
                  <p className="text-xs text-muted-foreground mt-2">{translateItems[translateIndex].hint}</p>
                )}
              </div>

              {/* Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Your translation
                </label>
                <input
                  type="text"
                  value={translateInput}
                  onChange={e => setTranslateInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !translateChecked && translateInput.trim() && checkTranslateAnswer()}
                  disabled={translateChecked}
                  placeholder="Type your answer…"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base focus:outline-none transition-colors disabled:opacity-70"
                  onFocus={e => (e.target.style.borderColor = `${currentMeta.accent}80`)}
                  onBlur={e => (e.target.style.borderColor = '')}
                />
              </div>

              {/* Feedback */}
              {translateChecked && (
                <div
                  className="rounded-2xl p-4 border text-sm"
                  style={{
                    backgroundColor: translateIsCorrect ? correctBg : incorrectBg,
                    borderColor: translateIsCorrect ? COLOR_CORRECT : COLOR_INCORRECT,
                    color: translateIsCorrect ? correctText : incorrectText,
                  }}
                >
                  {translateIsCorrect ? (
                    <p className="font-semibold">✓ Correct!</p>
                  ) : (
                    <div>
                      <p className="font-semibold">✗ Not quite</p>
                      <p className="mt-1 font-bold">{translateItems[translateIndex].answer}</p>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              {!translateChecked ? (
                <button
                  onClick={checkTranslateAnswer}
                  disabled={!translateInput.trim()}
                  className="w-full flex items-center justify-center rounded-2xl h-14 text-white text-base font-bold transition-all active:scale-95 disabled:opacity-40 mt-auto"
                  style={{ backgroundColor: currentMeta.accent }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={advanceTranslate}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl h-14 text-white text-base font-bold active:scale-95 transition-transform mt-auto"
                  style={{
                    backgroundColor: translateIsCorrect ? COLOR_CORRECT : '#64748b',
                  }}
                >
                  {translateIndex + 1 >= translateItems.length ? 'See results' : 'Next'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
