'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, usePresence, useAnimate } from 'framer-motion'
import { Volume2, ArrowRight, Bookmark, Zap, Star, Languages, Mic } from 'lucide-react'
import { type SaveItem, type SavedItemType } from '@/hooks/use-saved-items'
import { useVocabMastery } from '@/hooks/use-vocab-mastery'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { speak, splitArticle } from '@/lib/languages'
import { useTranslations } from 'next-intl'
import { HINT_AREA, SectionTitle } from '@/components/lesson/title-hint'
import { type Phrase, type QAQuestion } from '@/components/lesson/player/content'
import { WordChallengeModal } from '@/components/lesson/player/word-challenge-modal'

// ─── Vocabulary Word List (VanishList-inspired) ───────────────────────────────

export type VocabEntry = {
  id: string | number
  /** What the learner types */
  word: string
  translation: string
  /** Mastery key when it isn't the typed text (Q&A: the question) */
  masteryKey?: string
}

export function speakWord(word: string, langCode: string) {
  speak(word, langCode)
}

/**
 * Item star. With pronunciation on: white once typed (Challenge) or said well, gold
 * when both. Without it: gold once typed, as before.
 */
export function ItemStar({ typed, spoken, speech }: { typed: boolean; spoken: boolean; speech: boolean }) {
  const gold = speech ? typed && spoken : typed
  if (!typed && !spoken) return null
  return (
    <motion.span
      key={gold ? 'gold' : 'white'}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      title={gold ? 'Mastered' : typed ? 'Typed — say it too for the gold star' : 'Said — type it too for the gold star'}
    >
      <Star
        size={13}
        className={gold
          ? 'fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400'
          : 'fill-white text-slate-300 dark:fill-white dark:text-white/60'}
      />
    </motion.span>
  )
}

export function VocabRow({
  entry,
  bookmarked,
  onToggleBookmark,
  onChallenge,
  mastered,
  langCode,
  spoken,
  onSpeak,
}: {
  entry: VocabEntry
  bookmarked: boolean
  onToggleBookmark: (entry: VocabEntry) => void
  onChallenge: (entry: VocabEntry) => void
  mastered: boolean
  langCode: string
  /** Said well out loud (pronunciation practice) */
  spoken?: boolean
  /** Opens pronunciation practice; absent when it isn't available for the course */
  onSpeak?: (entry: VocabEntry) => void
}) {
  const t = useTranslations('lesson')
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
        <ItemStar typed={mastered} spoken={!!spoken} speech={!!onSpeak} />
        {onSpeak && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSpeak(entry) }}
            className="flex md:hidden md:group-hover:flex items-center gap-1 p-2 md:px-2.5 md:py-1 rounded-lg text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 active:scale-95 transition-all"
          >
            <Mic size={10} />
            <span className="hidden md:inline">{t('speak_row')}</span>
          </button>
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
export function PracticeSession({ entries, mode, isMastered, markMastered, onEnd, promptLabel }: {
  entries: VocabEntry[]
  mode: PracticeRequest['mode']
  promptLabel?: string
  isMastered: (word: string) => boolean
  markMastered: (word: string) => void
  onEnd: () => void
}) {
  const t = useTranslations('lesson')
  // Snapshot of the queue when the session starts
  const keyOf = (e: VocabEntry) => e.masteryKey ?? e.word
  const [queue] = useState(() => mode === 'resume' ? entries.filter(e => !isMastered(keyOf(e))) : entries)
  const [index, setIndex] = useState(0)
  const [masteredNow, setMasteredNow] = useState(0)

  function next(mastered: boolean) {
    const done = masteredNow + (mastered ? 1 : 0)
    setMasteredNow(done)
    if (index + 1 >= queue.length) {
      const total = entries.length
      const masteredTotal = entries.filter(e => isMastered(keyOf(e))).length + (mastered && !isMastered(keyOf(queue[index])) ? 1 : 0)
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
      onMastered={() => markMastered(keyOf(entry))}
      onComplete={() => next(true)}
    />
  )
}

export function VocabWordList({
  initialWords,
  isSaved,
  onToggleBookmark,
  languageCode,
  onMasteredCountChange,
  practice,
  onPracticeEnd,
  isSpoken,
  onSpeak,
}: {
  initialWords: VocabEntry[]
  isSaved: (type: SavedItemType, original: string) => boolean
  onToggleBookmark: (item: SaveItem) => void
  languageCode: string
  onMasteredCountChange?: (count: number) => void
  practice?: PracticeRequest | null
  onPracticeEnd?: () => void
  isSpoken?: (word: string) => boolean
  onSpeak?: (entry: VocabEntry) => void
}) {
  const t = useTranslations('lesson')
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
      <div {...HINT_AREA} className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400"><SectionTitle k="word_list" /></p>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
            {t('practice_progress', { done: masteredCount, total: entries.length })}
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
              spoken={isSpoken?.(entry.word)}
              onSpeak={onSpeak}
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

export function QAQuestionList({
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
  const t = useTranslations('lesson')
  const [challengeQ, setChallengeQ] = useState<QAQuestion | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const { isMastered, markMastered } = useVocabMastery(languageCode, 'qa')
  const masteredCount = questions.filter(q => isMastered(q.question)).length

  useEffect(() => {
    onMasteredCountChange?.(masteredCount)
  }, [masteredCount, onMasteredCountChange])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div {...HINT_AREA} className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400"><SectionTitle k="questions" /></p>
        <span className="flex items-center gap-3">
          {questions.some(q => q.translation) && (
            <button
              type="button"
              onClick={() => setShowTranslation(v => !v)}
              aria-pressed={showTranslation}
              className={cn(
                'flex items-center gap-1 text-[10px] font-bold transition-colors',
                showTranslation ? 'text-purple-500' : 'text-slate-400 hover:text-purple-500',
              )}
            >
              <Languages size={12} /> {showTranslation ? t('hide_translation') : t('show_translation')}
            </button>
          )}
          <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
            {t('ov_count_questions', { count: questions.length })}
          </span>
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
              {showTranslation && q.translation && (
                <p className="text-xs italic text-slate-500 dark:text-slate-400 mt-0.5">{q.translation}</p>
              )}
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
              onClick={(e) => { e.stopPropagation(); speakWord(q.options[q.correct], languageCode) }}
              className="shrink-0 p-2 rounded-lg hover:bg-sky-500/10 active:scale-90 transition-all"
            >
              <Volume2 size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark({ type: 'phrase', original: q.options[q.correct], translation: q.translation ?? q.question, languageCode: '' })}
              className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-primary/10 active:scale-90 transition-all"
            >
              <Bookmark
                size={14}
                className={cn(
                  'transition-colors',
                  isSaved('phrase', q.options[q.correct])
                    ? 'fill-primary text-primary'
                    : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
                )}
              />
            </button>
          </div>
        ))}
      </div>
      <div {...HINT_AREA} className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button
          onClick={onStartQuiz}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-purple-500 hover:text-purple-600 transition-colors"
        >
          <ArrowRight size={13} />
          <SectionTitle k="start_quiz" />
        </button>
      </div>

      <AnimatePresence>
        {challengeQ && (
          <WordChallengeModal
            key="word-challenge"
            word={challengeQ.options[challengeQ.correct]}
            translation={challengeQ.question}
            onClose={() => setChallengeQ(null)}
            onMastered={() => markMastered(challengeQ.question)}
          />
        )}
        {practice && (
          <PracticeSession
            key={`practice-${practice.key}`}
            entries={questions.map((q, i) => ({ id: `${q.question}-${i}`, word: q.options[q.correct], translation: q.question, masteryKey: q.question }))}
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

// ─── Phrase List ──────────────────────────────────────────────────────────────

/** The text with the given parts in bold (sentences: words of the lesson's grammar or vocabulary) */
export function BoldParts({ text, parts }: { text: string; parts?: string[] }) {
  if (!parts?.length) return <>{text}</>
  const escaped = [...parts].sort((a, b) => b.length - a.length).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // Whole words only: "a" or "is" must not light up inside "park" or "This". A part
  // ending in an apostrophe (French "qu'", "d'") is glued to the next word.
  const pieces = text.split(new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?:(?<=['’])|(?![\\p{L}\\p{N}]))`, 'gu'))
  return <>{pieces.map((piece, i) => parts.includes(piece) ? <strong key={i} className="font-bold">{piece}</strong> : piece)}</>
}

export function PhraseList({
  phrases,
  kind = 'phrases',
  onPractice,
  isSaved,
  onToggleBookmark,
  languageCode,
  onMasteredCountChange,
  practice,
  onPracticeEnd,
  isSpoken,
  onSpeak,
}: {
  phrases: Phrase[]
  /** sentences: the Q&A activity of converted lessons (mastery keys "qa:<sentence>") */
  kind?: 'phrases' | 'sentences'
  onPractice: () => void
  isSaved: (type: SavedItemType, original: string) => boolean
  onToggleBookmark: (item: SaveItem) => void
  languageCode: string
  onMasteredCountChange?: (count: number) => void
  practice?: PracticeRequest | null
  onPracticeEnd?: () => void
  /** Pronunciation practice: absent when it isn't available for the course */
  isSpoken?: (phrase: string) => boolean
  onSpeak?: (phrase: Phrase) => void
}) {
  const t = useTranslations('lesson')
  const [challengePhrase, setChallengePhrase] = useState<Phrase | null>(null)
  const isSentences = kind === 'sentences'
  const { isMastered, markMastered } = useVocabMastery(languageCode, isSentences ? 'qa' : 'phrase')
  const masteredCount = phrases.filter(p => isMastered(p.phrase)).length

  useEffect(() => {
    onMasteredCountChange?.(masteredCount)
  }, [masteredCount, onMasteredCountChange])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div {...HINT_AREA} className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400"><SectionTitle k={isSentences ? 'sentence_list' : 'phrase_list'} /></p>
        <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
          {t(isSentences ? 'ov_count_sentences' : 'ov_count_phrases', { count: phrases.length })}
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
              <p className={cn('text-sm text-slate-900 dark:text-white leading-snug', isSentences ? 'font-medium' : 'font-semibold')}>
                {isSentences ? <BoldParts text={p.phrase} parts={p.bold} /> : p.phrase}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 group-hover:opacity-0 group-hover:transition-none transition-all">
                {p.translation}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              <ItemStar typed={isMastered(p.phrase)} spoken={!!isSpoken?.(p.phrase)} speech={!!onSpeak} />
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(p)}
                  className="flex md:hidden md:group-hover:flex items-center gap-1 p-2 md:px-2.5 md:py-1 rounded-lg text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 active:scale-95 transition-all"
                >
                  <Mic size={10} />
                  <span className="hidden md:inline">{t('speak_row')}</span>
                </button>
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
      <div {...HINT_AREA} className="shrink-0 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button
          onClick={onPractice}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          <ArrowRight size={13} />
          <SectionTitle k="start_practice" />
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
