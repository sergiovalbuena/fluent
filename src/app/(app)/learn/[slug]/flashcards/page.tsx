'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { AppTopbar } from '@/components/layout/app-topbar'

interface FlashCard {
  word: string
  translation: string
  emoji: string
  example?: string
}

export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [cards, setCards] = useState<FlashCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<number[]>([])
  const [learning, setLearning] = useState<number[]>([])
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCards() {
      const supabase = createClient()

      const { data: module } = await supabase
        .from('modules')
        .select('id')
        .eq('slug', slug)
        .eq('is_published', true)
        .limit(1)
        .maybeSingle()

      const { data: lessons } = await supabase
        .from('lessons')
        .select('content, type')
        .eq('module_id', module?.id ?? '')
        .eq('type', 'vocabulary')
        .eq('is_published', true)

      const allWords: FlashCard[] = []
      for (const lesson of lessons ?? []) {
        const content = lesson.content as { items?: Array<{ word: string; translation: string; icon?: string; example?: string }> }
        if (content?.items) {
          allWords.push(...content.items.map(w => ({
            word: w.word,
            translation: w.translation,
            emoji: w.icon ?? '📝',
            example: w.example
          })))
        }
      }

      // Fallback demo cards if no data
      if (allWords.length === 0) {
        allWords.push(
          { word: 'Hola', translation: 'Hello', emoji: '👋' },
          { word: 'Gracias', translation: 'Thank you', emoji: '🙏' },
          { word: 'Por favor', translation: 'Please', emoji: '🤝' },
          { word: 'Buenos días', translation: 'Good morning', emoji: '🌅' },
          { word: 'Buenas noches', translation: 'Good night', emoji: '🌙' },
        )
      }

      setCards(allWords)
      setLoading(false)
    }
    loadCards()
  }, [slug])

  const currentCard = cards[currentIndex]
  const progress = cards.length > 0 ? Math.round((currentIndex / cards.length) * 100) : 0

  function handleKnown() {
    setKnown(prev => [...prev, currentIndex])
    advance()
  }

  function handleLearning() {
    setLearning(prev => [...prev, currentIndex])
    advance()
  }

  function advance() {
    setFlipped(false)
    if (currentIndex + 1 >= cards.length) {
      setFinished(true)
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">🃏</div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppTopbar back={{ href: `/learn/${slug}`, label: 'Flashcards' }} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 text-center">
          <span className="text-6xl">🎉</span>
          <h2 className="text-2xl font-bold">Session Complete!</h2>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{known.length}</p>
              <p className="text-sm text-green-700 dark:text-green-400">I knew it</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-orange-600">{learning.length}</p>
              <p className="text-sm text-orange-700 dark:text-orange-400">Still learning</p>
            </div>
          </div>
          <button
            onClick={() => {
              setCurrentIndex(0)
              setFlipped(false)
              setKnown([])
              setLearning([])
              setFinished(false)
            }}
            className="w-full max-w-xs cursor-pointer flex items-center justify-center rounded-xl h-12 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20"
          >
            Practice Again
          </button>
          <Link href={`/learn/${slug}`} className="text-primary font-semibold text-sm">
            Back to Module
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar back={{ href: `/learn/${slug}`, label: 'Flashcards' }} />
      {/* Progress sub-bar */}
      <div className="px-4 md:px-8 py-2 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground font-medium">{currentIndex + 1} / {cards.length}</span>
          <span className="text-xs text-primary font-bold">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-primary/10 [&>div]:bg-primary" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Card */}
        <div
          className="w-full max-w-sm cursor-pointer"
          onClick={() => setFlipped(!flipped)}
        >
          <div className={`relative w-full transition-all duration-500`} style={{ perspective: '1000px' }}>
            <div
              className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-primary/10 flex flex-col items-center justify-center gap-4 p-8 min-h-[240px] text-center select-none"
              style={{
                backfaceVisibility: 'hidden',
              }}
            >
              {!flipped ? (
                <>
                  <span className="text-7xl">{currentCard.emoji}</span>
                  <h2 className="text-3xl font-bold">{currentCard.word}</h2>
                  <p className="text-sm text-muted-foreground">Tap to reveal translation</p>
                </>
              ) : (
                <>
                  <span className="text-7xl">{currentCard.emoji}</span>
                  <h2 className="text-2xl font-bold text-primary">{currentCard.translation}</h2>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{currentCard.word}</p>
                  {currentCard.example && (
                    <p className="text-xs text-muted-foreground italic mt-1">&quot;{currentCard.example}&quot;</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {flipped && (
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={handleKnown}
              className="w-full cursor-pointer flex items-center justify-center rounded-xl h-14 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20"
            >
              I knew it ✓
            </button>
            <button
              onClick={handleLearning}
              className="w-full cursor-pointer flex items-center justify-center rounded-xl h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-base font-bold transition-transform active:scale-95"
            >
              Still learning
            </button>
          </div>
        )}

        {!flipped && (
          <p className="text-sm text-muted-foreground">Tap the card to flip it</p>
        )}
      </main>
    </div>
  )
}
