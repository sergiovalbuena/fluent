'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type VideoEntry = {
  id: string
  title: string
  description: string
  level: 'Beginner' | 'Elementary' | 'Intermediate'
  duration: string
  skills: string[]
  youtubeSearchQuery: string
  questions: Array<{ q: string; options: string[]; answer: string }>
}

type Phase = 'library' | 'quiz' | 'finished'

// ── Data ──────────────────────────────────────────────────────────────────────
const VIDEOS: VideoEntry[] = [
  {
    id: 'v1',
    title: 'Spanish Greetings & Introductions',
    description: 'Learn how to greet people and introduce yourself in Spanish.',
    level: 'Beginner',
    duration: '~8 min',
    skills: ['Speaking', 'Vocabulary'],
    youtubeSearchQuery: 'learn spanish greetings introductions beginners',
    questions: [
      { q: 'How do you say "Good morning" in Spanish?', options: ['Buenas noches', 'Buenos días', 'Buenas tardes', 'Hola'], answer: 'Buenos días' },
      { q: 'What does "¿Cómo te llamas?" mean?', options: ['How are you?', 'Where are you from?', 'What is your name?', 'How old are you?'], answer: 'What is your name?' },
      { q: 'How do you say "Nice to meet you"?', options: ['Gracias', 'De nada', 'Mucho gusto', 'Por favor'], answer: 'Mucho gusto' },
    ],
  },
  {
    id: 'v2',
    title: 'Spanish Numbers 1–100',
    description: 'Master counting from 1 to 100 in Spanish with examples.',
    level: 'Beginner',
    duration: '~10 min',
    skills: ['Vocabulary', 'Listening'],
    youtubeSearchQuery: 'learn spanish numbers 1 to 100 beginners',
    questions: [
      { q: 'What is "quince" in English?', options: ['Five', 'Fifty', 'Fifteen', 'Forty'], answer: 'Fifteen' },
      { q: 'How do you say "thirty" in Spanish?', options: ['Trece', 'Treinta', 'Tres', 'Trescientos'], answer: 'Treinta' },
      { q: 'What does "cien" mean?', options: ['Ten', 'Fifty', 'One hundred', 'Twenty'], answer: 'One hundred' },
    ],
  },
  {
    id: 'v3',
    title: 'Common Spanish Phrases for Travel',
    description: 'Essential phrases for ordering food, asking directions, and getting around.',
    level: 'Elementary',
    duration: '~12 min',
    skills: ['Speaking', 'Grammar'],
    youtubeSearchQuery: 'learn spanish travel phrases essential conversation',
    questions: [
      { q: 'How do you ask "Where is the bathroom?"', options: ['¿Cuánto cuesta?', '¿Dónde está el baño?', '¿Qué hora es?', '¿Hablas inglés?'], answer: '¿Dónde está el baño?' },
      { q: 'What does "¿Cuánto cuesta?" mean?', options: ['Where is it?', 'Can you help me?', 'How much does it cost?', 'What time is it?'], answer: 'How much does it cost?' },
      { q: "How do you say \"I don't understand\"?", options: ['No sé', 'No tengo', 'No entiendo', 'No puedo'], answer: 'No entiendo' },
    ],
  },
  {
    id: 'v4',
    title: 'Spanish Colors & Descriptions',
    description: 'Learn colors and how to describe people and objects in Spanish.',
    level: 'Beginner',
    duration: '~7 min',
    skills: ['Vocabulary', 'Grammar'],
    youtubeSearchQuery: 'learn spanish colors adjectives descriptions beginners',
    questions: [
      { q: 'What is "azul" in English?', options: ['Green', 'Red', 'Blue', 'Yellow'], answer: 'Blue' },
      { q: 'How do you say "big" in Spanish?', options: ['Pequeño', 'Rápido', 'Grande', 'Bonito'], answer: 'Grande' },
      { q: 'What does "rojo" mean?', options: ['Red', 'Pink', 'Orange', 'Purple'], answer: 'Red' },
    ],
  },
  {
    id: 'v5',
    title: 'Spanish Present Tense Verbs',
    description: 'Conjugate the most common Spanish verbs in the present tense.',
    level: 'Intermediate',
    duration: '~15 min',
    skills: ['Grammar', 'Speaking'],
    youtubeSearchQuery: 'spanish present tense conjugation common verbs',
    questions: [
      { q: 'How do you conjugate "hablar" for "yo"?', options: ['Hablas', 'Habla', 'Hablo', 'Hablamos'], answer: 'Hablo' },
      { q: 'What is the "tú" form of "comer"?', options: ['Como', 'Come', 'Comes', 'Comemos'], answer: 'Comes' },
      { q: 'How do you say "We live" using "vivir"?', options: ['Viven', 'Vivís', 'Vivo', 'Vivimos'], answer: 'Vivimos' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
async function saveGameResult(correct: number, total: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { xp: 5, gems: 3 }
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const xp = pct >= 80 ? 15 : pct >= 60 ? 10 : 5
  const gems = 3
  const { data: profile } = await supabase
    .from('user_profiles').select('total_xp, total_gems').eq('user_id', user.id).maybeSingle()
  await supabase
    .from('user_profiles')
    .update({ total_xp: (profile?.total_xp ?? 0) + xp, total_gems: (profile?.total_gems ?? 0) + gems })
    .eq('user_id', user.id)
  return { xp, gems }
}

const LEVEL_STYLES: Record<VideoEntry['level'], string> = {
  Beginner: 'bg-emerald-500/20 text-emerald-400',
  Elementary: 'bg-amber-500/20 text-amber-400',
  Intermediate: 'bg-blue-500/20 text-blue-400',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShortVideoPage() {
  const [phase, setPhase] = useState<Phase>('library')
  const [watchedIds, setWatchedIds] = useState<string[]>([])
  const [openedIds, setOpenedIds] = useState<string[]>([])

  // Quiz state
  const [activeVideo, setActiveVideo] = useState<VideoEntry | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [revealed, setRevealed] = useState(false)

  // Result
  const [result, setResult] = useState<{ xp: number; gems: number } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('fluent-watched-videos')
    if (stored) setWatchedIds(JSON.parse(stored) as string[])
  }, [])

  function markWatched(id: string) {
    const next = [...watchedIds, id].filter((v, i, a) => a.indexOf(v) === i)
    setWatchedIds(next)
    localStorage.setItem('fluent-watched-videos', JSON.stringify(next))
  }

  function handleWatchVideo(video: VideoEntry) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(video.youtubeSearchQuery)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpenedIds(prev => [...prev, video.id].filter((v, i, a) => a.indexOf(v) === i))
  }

  function handleMarkWatched(id: string) {
    markWatched(id)
  }

  function startQuiz(video: VideoEntry) {
    setActiveVideo(video)
    setQuestionIndex(0)
    setSelectedOption(null)
    setCorrectAnswers(0)
    setRevealed(false)
    setResult(null)
    setPhase('quiz')
  }

  function handleSelect(option: string) {
    if (revealed || !activeVideo) return
    setSelectedOption(option)
    setRevealed(true)
    const isCorrect = option === activeVideo.questions[questionIndex].answer
    const nextCorrect = correctAnswers + (isCorrect ? 1 : 0)
    if (isCorrect) setCorrectAnswers(nextCorrect)
    setTimeout(() => advanceQuestion(nextCorrect), 1200)
  }

  function advanceQuestion(currentCorrect: number) {
    if (!activeVideo) return
    const nextIndex = questionIndex + 1
    if (nextIndex >= activeVideo.questions.length) {
      finishQuiz(currentCorrect)
    } else {
      setQuestionIndex(nextIndex)
      setSelectedOption(null)
      setRevealed(false)
    }
  }

  async function finishQuiz(finalCorrect: number) {
    if (!activeVideo) return
    setCorrectAnswers(finalCorrect)
    setPhase('finished')
    const res = await saveGameResult(finalCorrect, 3)
    setResult(res)
  }

  const currentQuestion = activeVideo?.questions[questionIndex]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#120000' }}>
      <AppTopbar title="Short Video" back={{ href: '/play', label: 'Games' }} />

      <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">

        {/* ── LIBRARY ───────────────────────────────────────────────────── */}
        {phase === 'library' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mt-2">
              <div
                className="size-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' }}
              >
                <Play size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Spanish Video Library</h1>
                <p className="text-white/40 text-xs mt-0.5">
                  Watch curated Spanish lessons on YouTube, then test your comprehension.
                </p>
              </div>
            </div>

            {/* Video cards */}
            <div className="flex flex-col gap-4">
              {VIDEOS.map(video => {
                const isWatched = watchedIds.includes(video.id)
                const isOpened = openedIds.includes(video.id)

                return (
                  <div
                    key={video.id}
                    className={cn(
                      'bg-white/[0.03] border rounded-2xl p-5 flex flex-col gap-3',
                      isWatched ? 'border-red-500/30' : 'border-white/10'
                    )}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', LEVEL_STYLES[video.level])}>
                            {video.level}
                          </span>
                          {isWatched && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                              ✓ Watched
                            </span>
                          )}
                        </div>
                        <p className="text-white font-bold text-base leading-snug">{video.title}</p>
                        <p className="text-white/40 text-sm mt-1 leading-snug">{video.description}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-white/5 text-white/40 text-[10px] font-bold px-2 py-1 rounded-lg">
                        {video.duration}
                      </span>
                      {video.skills.map(s => (
                        <span key={s} className="bg-white/5 text-white/40 text-[10px] font-bold px-2 py-1 rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleWatchVideo(video)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-white/10 hover:bg-white/15 transition-all border border-white/10"
                      >
                        <Play size={13} />
                        Watch on YouTube
                      </button>

                      {isOpened && !isWatched && (
                        <button
                          onClick={() => handleMarkWatched(video.id)}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-all border border-emerald-400/20"
                        >
                          I watched it ✓
                        </button>
                      )}

                      <button
                        onClick={() => isWatched ? startQuiz(video) : undefined}
                        disabled={!isWatched}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                          isWatched
                            ? 'text-white hover:scale-105'
                            : 'text-white/30 bg-white/5 border border-white/10 cursor-not-allowed'
                        )}
                        style={isWatched ? { background: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' } : {}}
                      >
                        {isWatched ? 'Take Quiz →' : 'Watch first'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── QUIZ ──────────────────────────────────────────────────────── */}
        {phase === 'quiz' && activeVideo && currentQuestion && (
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6 mt-4"
          >
            {/* Video title */}
            <div className="flex items-center gap-2">
              <div
                className="size-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' }}
              >
                <Play size={14} className="text-white" />
              </div>
              <p className="text-white/60 text-sm font-medium truncate">{activeVideo.title}</p>
            </div>

            {/* Counter */}
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-sm">
                Question <span className="text-white font-bold">{questionIndex + 1}</span> / {activeVideo.questions.length}
              </span>
              <span className="text-red-400 font-bold text-sm">{correctAnswers} correct</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-red-400 rounded-full transition-all"
                style={{ width: `${(questionIndex / activeVideo.questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="bg-white/[0.04] border border-red-400/20 rounded-3xl p-6">
              <p className="text-white text-xl font-bold leading-snug">{currentQuestion.q}</p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map(option => {
                const isSelected = selectedOption === option
                const isCorrect = option === currentQuestion.answer
                let style = 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                if (revealed) {
                  if (isCorrect) style = 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  else if (isSelected && !isCorrect) style = 'bg-red-500/20 border-red-400 text-red-300'
                  else style = 'bg-white/5 border-white/10 text-white/30'
                }
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    disabled={revealed}
                    className={cn(
                      'w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-sm transition-all',
                      style
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {revealed && (
              <button
                onClick={() => advanceQuestion(correctAnswers)}
                className="w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' }}
              >
                {questionIndex + 1 >= activeVideo.questions.length ? 'See Results' : 'Next Question →'}
              </button>
            )}
          </motion.div>
        )}

        {/* ── FINISHED ──────────────────────────────────────────────────── */}
        {phase === 'finished' && activeVideo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 mt-8"
          >
            <div
              className="size-[100px] rounded-[2rem] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' }}
            >
              <Play size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">Quiz Complete!</h2>
              <p className="text-white/40 text-sm mt-1 max-w-xs">{activeVideo.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-red-500/20">
                <p className="text-red-400 text-4xl font-bold tabular-nums">{correctAnswers}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Correct</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white text-4xl font-bold tabular-nums">
                  {Math.round((correctAnswers / 3) * 100)}%
                </p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Accuracy</p>
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
                onClick={() => setPhase('library')}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7f1d1d, #b91c1c)' }}
              >
                Back to Library
              </button>
              <a
                href="/play"
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-all"
              >
                Back to Games
              </a>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  )
}
