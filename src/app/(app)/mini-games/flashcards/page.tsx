'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { SourcePicker } from '@/components/mini-games/source-picker'
import { createClient } from '@/lib/supabase/client'
import { addRewards } from '@/lib/rewards'
import { useLocale, useTranslations } from 'next-intl'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { usePracticeContent } from '@/lib/practice-source'

/** A language's name in the UI language ("French", "francés"…) */
function useLanguageName() {
  const locale = useLocale()
  return (code: string) => {
    try { return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code } catch { return code }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type WordPair = { word: string; translation: string }
type Phase = 'ready' | 'playing' | 'finished'

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function saveGameResult(correct: number, total: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { xp: 5, gems: 3 }
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const xp = pct >= 80 ? 15 : pct >= 60 ? 10 : 5
  const gems = 3
  const awarded = await addRewards(supabase, user.id, { xp, gems, reason: 'minigame' })
  return awarded
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlashCardsPage() {
  const { languageCode, translationLang } = useActiveLanguage()
  const t = useTranslations('games')
  const tm = useTranslations('mini_games')
  const languageName = useLanguageName()
  // Words from the source chosen on /mini-games (all lessons or one)
  const practice = usePracticeContent(languageCode, translationLang)
  const pool = useMemo<WordPair[]>(
    () => [
      ...practice.words.map(w => ({ word: w.word, translation: w.translation })),
      // Short phrases work as cards too
      ...practice.phrases.filter(p => p.phrase.split(' ').length <= 5).map(p => ({ word: p.phrase, translation: p.translation })),
    ],
    [practice.words, practice.phrases],
  )
  const loading = practice.loading
  const [phase, setPhase] = useState<Phase>('ready')

  // Game state
  const [deck, setDeck] = useState<WordPair[]>([])
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredCount, setMasteredCount] = useState(0)
  const [totalCards, setTotalCards] = useState(0)

  // Result
  const [result, setResult] = useState<{ xp: number; gems: number } | null>(null)


  function buildDeck(wordPool: WordPair[]): WordPair[] {
    return shuffle(wordPool).slice(0, Math.min(20, wordPool.length))
  }

  function startGame() {
    const d = buildDeck(pool)
    setDeck(d)
    setTotalCards(d.length)
    setMasteredCount(0)
    setIsFlipped(false)
    setResult(null)
    setPhase('playing')
  }

  const currentCard = deck[0]

  function handleFlip() {
    setIsFlipped(prev => !prev)
  }

  function handleGotIt() {
    const next = deck.slice(1)
    setMasteredCount(prev => prev + 1)
    if (next.length === 0) {
      finishGame(masteredCount + 1, totalCards)
    } else {
      setDeck(next)
      setIsFlipped(false)
    }
  }

  function handleStillLearning() {
    const [head, ...rest] = deck
    // Runs in a click handler, not during render
    // eslint-disable-next-line react-hooks/purity
    const insertAt = Math.floor(Math.random() * (rest.length + 1))
    const next = [...rest.slice(0, insertAt), head, ...rest.slice(insertAt)]
    if (next.length === 0) {
      finishGame(masteredCount, totalCards)
    } else {
      setDeck(next)
      setIsFlipped(false)
    }
  }

  async function finishGame(mastered: number, total: number) {
    setPhase('finished')
    const res = await saveGameResult(mastered, total)
    setResult(res)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0a0c14' }}>
      <AppTopbar title={tm('flashcards_title')} back={{ href: '/mini-games', label: tm('title') }} />

      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">

        {/* ── READY ─────────────────────────────────────────────────────── */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8 mt-8"
          >
            <div
              className="size-[120px] rounded-[2.5rem] flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
            >
              <BookOpen size={56} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">{tm('flashcards_title')}</h1>
              <p className="text-white/50 text-sm max-w-sm">
                {tm('flashcards_desc')}
              </p>
            </div>
            {/* Where the words come from (shared by all mini-games) */}
            <SourcePicker tone="dark" className="w-full" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: t('stat_cards'), value: loading ? '…' : String(Math.min(20, pool.length)) },
                { label: t('stat_skill'), value: t('skill_vocab') },
                { label: t('stat_reward'), value: '+3 💎' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              disabled={loading || pool.length === 0}
              className="px-10 py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
            >
              {loading ? t('loading') : t('start')}
            </button>
          </motion.div>
        )}

        {/* ── PLAYING ───────────────────────────────────────────────────── */}
        {phase === 'playing' && currentCard && (
          <div className="flex flex-col gap-6 mt-4">
            {/* Progress */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">
                <span className="text-white font-bold">{deck.length}</span> {t('remaining')}
              </span>
              <span className="text-amber-400 font-bold">
                {t('n_mastered', { n: masteredCount })}
              </span>
            </div>

            {/* Card with 3D flip */}
            <div
              style={{ perspective: '1000px' }}
              className="w-full cursor-pointer"
              onClick={handleFlip}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ transformStyle: 'preserve-3d', position: 'relative' }}
                className="w-full h-64"
              >
                {/* Front face */}
                <div
                  style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                  className="rounded-3xl bg-amber-900/30 border border-amber-500/30 flex flex-col items-center justify-center p-8"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-4">{languageName(languageCode)}</p>
                  <p className="text-4xl font-bold text-white text-center">{currentCard.word}</p>
                  <p className="text-xs text-amber-400/40 mt-6">{t('tap_reveal')}</p>
                </div>

                {/* Back face */}
                <div
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
                  className="rounded-3xl bg-amber-500/20 border border-amber-400/40 flex flex-col items-center justify-center p-8"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-4">{languageName(translationLang)}</p>
                  <p className="text-3xl font-bold text-amber-300 text-center">{currentCard.translation}</p>
                </div>
              </motion.div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleStillLearning}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all"
              >
                {t('still_learning')}
              </button>
              <button
                onClick={handleGotIt}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
              >
                {t('got_it')}
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(masteredCount / totalCards) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── FINISHED ──────────────────────────────────────────────────── */}
        {phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 mt-8"
          >
            <div
              className="size-[100px] rounded-[2rem] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
            >
              <BookOpen size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">{t('deck_complete')}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-amber-500/20">
                <p className="text-amber-400 text-4xl font-bold tabular-nums">{masteredCount}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{t('stat_mastered')}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white text-4xl font-bold tabular-nums">{totalCards}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{t('stat_total_cards')}</p>
              </div>
            </div>

            {result && (
              <div className="flex gap-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-3 text-center">
                  <p className="text-yellow-400 font-bold text-lg">+{result.xp} XP</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-center">
                  <p className="text-amber-400 font-bold text-lg">+{result.gems} 💎</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
              >
                {t('play_again')}
              </button>
              <a
                href="/mini-games"
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-all"
              >
                {t('back_to_games')}
              </a>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  )
}
