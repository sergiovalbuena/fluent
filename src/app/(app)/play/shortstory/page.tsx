'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type Story = {
  title: string
  text: string
  questions: Array<{ q: string; options: string[]; answer: string }>
}

type Phase = 'ready' | 'reading' | 'quiz' | 'finished'

// ── Data ──────────────────────────────────────────────────────────────────────
const STORIES: Story[] = [
  {
    title: 'En el Café',
    text: 'María va al café todas las mañanas. Pide un café con leche y un croissant. El barista se llama Carlos y siempre es muy amable. María trabaja como profesora de inglés. Le gusta leer el periódico mientras toma su café. El café se llama "La Esquina" y está en el centro de la ciudad.',
    questions: [
      { q: '¿Qué pide María en el café?', options: ['Un té y un croissant', 'Un café con leche y un croissant', 'Un zumo y un croissant', 'Un café solo'], answer: 'Un café con leche y un croissant' },
      { q: '¿Cómo se llama el barista?', options: ['Miguel', 'Juan', 'Carlos', 'Pedro'], answer: 'Carlos' },
      { q: '¿Cuál es la profesión de María?', options: ['Médica', 'Abogada', 'Profesora de inglés', 'Enfermera'], answer: 'Profesora de inglés' },
      { q: '¿Cómo se llama el café?', options: ['La Esquina', 'El Centro', 'La Plaza', 'El Rincón'], answer: 'La Esquina' },
    ],
  },
  {
    title: 'El Fin de Semana',
    text: 'Los sábados, Miguel y su familia van al parque. Su hija pequeña, Lucía, tiene cinco años y le encanta jugar con los perros. Miguel lleva una pelota y una manta para sentarse. Su esposa, Ana, prepara sándwiches y zumo de naranja. Pasan tres horas en el parque. Es su actividad favorita de la semana.',
    questions: [
      { q: '¿Cuándo van al parque?', options: ['Los domingos', 'Los viernes', 'Los sábados', 'Los jueves'], answer: 'Los sábados' },
      { q: '¿Cuántos años tiene Lucía?', options: ['Tres años', 'Cuatro años', 'Seis años', 'Cinco años'], answer: 'Cinco años' },
      { q: '¿Qué lleva Miguel al parque?', options: ['Un libro y una manta', 'Una pelota y una manta', 'Comida y agua', 'Un periódico'], answer: 'Una pelota y una manta' },
      { q: '¿Cuánto tiempo pasan en el parque?', options: ['Una hora', 'Dos horas', 'Tres horas', 'Cuatro horas'], answer: 'Tres horas' },
    ],
  },
  {
    title: 'De Compras',
    text: 'Elena necesita comprar ropa para el trabajo. Va a una tienda en el centro comercial. Busca una blusa azul y unos pantalones negros. La vendedora se llama Rosa y le ayuda mucho. Elena encuentra una blusa bonita por treinta euros. Los pantalones cuestan cincuenta euros. Al final, compra las dos cosas y está muy contenta.',
    questions: [
      { q: '¿Por qué necesita ropa Elena?', options: ['Para una fiesta', 'Para el trabajo', 'Para viajar', 'Para hacer deporte'], answer: 'Para el trabajo' },
      { q: '¿Qué color de blusa busca Elena?', options: ['Roja', 'Verde', 'Azul', 'Blanca'], answer: 'Azul' },
      { q: '¿Cuánto cuesta la blusa?', options: ['Veinte euros', 'Cuarenta euros', 'Treinta euros', 'Cincuenta euros'], answer: 'Treinta euros' },
      { q: '¿Cómo se siente Elena al final?', options: ['Cansada', 'Triste', 'Muy contenta', 'Preocupada'], answer: 'Muy contenta' },
    ],
  },
  {
    title: 'El Viaje',
    text: 'Juan planea un viaje a México para el mes de julio. Compra un billete de avión y reserva un hotel pequeño y económico. Va a visitar la Ciudad de México, Oaxaca y Cancún. Su amigo Roberto vive en México y le va a mostrar los lugares más bonitos. Juan estudia español todos los días para prepararse mejor para el viaje.',
    questions: [
      { q: '¿Adónde va Juan de viaje?', options: ['España', 'Argentina', 'México', 'Colombia'], answer: 'México' },
      { q: '¿Cuándo es el viaje?', options: ['En junio', 'En agosto', 'En enero', 'En julio'], answer: 'En julio' },
      { q: '¿Quién vive en México?', options: ['Carlos', 'Roberto', 'Miguel', 'Ana'], answer: 'Roberto' },
      { q: '¿Cómo se prepara Juan para el viaje?', options: ['Leyendo libros', 'Estudiando español todos los días', 'Viendo películas', 'Practicando deportes'], answer: 'Estudiando español todos los días' },
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShortStoryPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [story, setStory] = useState<Story | null>(null)

  // Quiz state
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [revealed, setRevealed] = useState(false)

  // Result
  const [result, setResult] = useState<{ xp: number; gems: number } | null>(null)

  function pickAndStart() {
    const s = STORIES[Math.floor(Math.random() * STORIES.length)]
    setStory(s)
    setPhase('reading')
  }

  function startQuiz() {
    setQuestionIndex(0)
    setSelectedOption(null)
    setCorrectAnswers(0)
    setRevealed(false)
    setPhase('quiz')
  }

  function handleSelect(option: string) {
    if (revealed) return
    setSelectedOption(option)
    setRevealed(true)
    const isCorrect = option === story!.questions[questionIndex].answer
    const nextCorrect = correctAnswers + (isCorrect ? 1 : 0)
    if (isCorrect) setCorrectAnswers(nextCorrect)
    // Auto-advance after 1.2s
    setTimeout(() => advanceQuestion(nextCorrect), 1200)
  }

  function advanceQuestion(currentCorrect: number) {
    const nextIndex = questionIndex + 1
    if (nextIndex >= (story?.questions.length ?? 4)) {
      finishQuiz(currentCorrect)
    } else {
      setQuestionIndex(nextIndex)
      setSelectedOption(null)
      setRevealed(false)
    }
  }

  async function finishQuiz(finalCorrect: number) {
    setCorrectAnswers(finalCorrect)
    setPhase('finished')
    const res = await saveGameResult(finalCorrect, 4)
    setResult(res)
  }

  const currentQuestion = story?.questions[questionIndex]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#120500' }}>
      <AppTopbar title="Short Story" back={{ href: '/play', label: 'Games' }} />

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
              style={{ background: 'linear-gradient(135deg, #9a3412, #c2410c)' }}
            >
              <BookOpen size={56} className="text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">Short Story</h1>
              <p className="text-white/50 text-sm max-w-sm">
                Read a Spanish micro-story and test your comprehension
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: 'Stories', value: '4' },
                { label: 'Questions', value: '4 each' },
                { label: 'Reward', value: '+3 💎' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={pickAndStart}
              className="px-10 py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #9a3412, #c2410c)' }}
            >
              Start Reading
            </button>
          </motion.div>
        )}

        {/* ── READING ───────────────────────────────────────────────────── */}
        {phase === 'reading' && story && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 mt-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-orange-400">{story.title}</h2>
              <span className="text-white/30 text-xs">~30 sec read</span>
            </div>

            <div className="bg-white/[0.04] border border-orange-400/20 rounded-3xl p-6">
              <p className="text-white/90 text-base leading-relaxed">{story.text}</p>
            </div>

            <button
              onClick={startQuiz}
              className="w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #9a3412, #c2410c)' }}
            >
              I've read it — take the quiz →
            </button>
          </motion.div>
        )}

        {/* ── QUIZ ──────────────────────────────────────────────────────── */}
        {phase === 'quiz' && story && currentQuestion && (
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6 mt-4"
          >
            {/* Counter */}
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-sm">
                Question <span className="text-white font-bold">{questionIndex + 1}</span> / {story.questions.length}
              </span>
              <span className="text-orange-400 font-bold text-sm">{correctAnswers} correct</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${(questionIndex / story.questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="bg-white/[0.04] border border-orange-400/20 rounded-3xl p-6">
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
                style={{ background: 'linear-gradient(135deg, #9a3412, #c2410c)' }}
              >
                {questionIndex + 1 >= story.questions.length ? 'See Results' : 'Next Question →'}
              </button>
            )}
          </motion.div>
        )}

        {/* ── FINISHED ──────────────────────────────────────────────────── */}
        {phase === 'finished' && story && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 mt-8"
          >
            <div
              className="size-[100px] rounded-[2rem] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #9a3412, #c2410c)' }}
            >
              <BookOpen size={44} className="text-white" />
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">{story.title}</h2>
              <p className="text-white/40 text-sm mt-1">Comprehension Quiz Complete</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-orange-500/20">
                <p className="text-orange-400 text-4xl font-bold tabular-nums">{correctAnswers}</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Correct</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white text-4xl font-bold tabular-nums">
                  {Math.round((correctAnswers / 4) * 100)}%
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
                onClick={pickAndStart}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #9a3412, #c2410c)' }}
              >
                Try another story
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
