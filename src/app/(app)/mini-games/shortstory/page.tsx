'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { BookOpen, Eye, EyeOff, Volume2 } from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { SourcePicker } from '@/components/mini-games/source-picker'
import { ChoiceQuiz, QuizResult, type ChoiceQuestion } from '@/components/mini-games/choice-quiz'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { speak } from '@/lib/languages'
import { usePracticeContent, type PracticeStory } from '@/lib/practice-source'
import { createClient } from '@/lib/supabase/client'
import { addRewards } from '@/lib/rewards'

// Short Story: read one of your lessons' stories, then complete sentences from
// it with its key expressions. Everything is in the course language.

type Phase = 'ready' | 'reading' | 'quiz' | 'finished'

const ACCENT = { text: 'text-orange-400', border: 'border-orange-400/30', bar: 'bg-orange-400', button: 'bg-gradient-to-br from-orange-800 to-orange-600' }
const MAX_QUESTIONS = 5

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Sentences of the story with one key expression blanked out */
function storyQuestions(story: PracticeStory, others: string[]): ChoiceQuestion[] {
  const sentences = story.text.match(/[^.!?…]+[.!?…]+["»”]?|[^.!?…]+$/g)?.map(s => s.trim()) ?? []
  const questions: ChoiceQuestion[] = []
  const used = new Set<string>()
  for (const expr of shuffle(story.highlighted)) {
    const re = new RegExp(`(^|[^\\p{L}])(${escape(expr)})(?=[^\\p{L}]|$)`, 'iu')
    const sentence = sentences.find(s => re.test(s) && !used.has(s))
    if (!sentence) continue
    const m = re.exec(sentence)!
    const answer = m[2]
    const pool = [...story.highlighted, ...others].filter(o => o.toLowerCase() !== answer.toLowerCase())
    const distractors = shuffle([...new Set(pool)]).slice(0, 3)
    if (distractors.length < 2) continue
    used.add(sentence)
    questions.push({
      q: sentence.slice(0, m.index + m[1].length) + '___' + sentence.slice(m.index + m[1].length + answer.length),
      options: shuffle([answer, ...distractors]),
      answer,
    })
    if (questions.length >= MAX_QUESTIONS) break
  }
  return questions
}

async function saveGameResult(correct: number, total: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  return addRewards(supabase, user.id, { xp: pct >= 80 ? 15 : pct >= 60 ? 10 : 5, gems: 3, reason: 'minigame' })
}

/** The story with its key expressions in bold */
function HighlightedStory({ story }: { story: PracticeStory }) {
  if (story.highlighted.length === 0) return <>{story.text}</>
  const re = new RegExp(`(${story.highlighted.map(escape).sort((a, b) => b.length - a.length).join('|')})`, 'giu')
  return (
    <>
      {story.text.split(re).map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-bold text-orange-300">{part}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  )
}

export default function ShortStoryPage() {
  const t = useTranslations('games')
  const tm = useTranslations('mini_games')
  const { languageCode, translationLang } = useActiveLanguage()
  const practice = usePracticeContent(languageCode, translationLang)

  const [phase, setPhase] = useState<Phase>('ready')
  const [story, setStory] = useState<PracticeStory | null>(null)
  const [questions, setQuestions] = useState<ChoiceQuestion[]>([])
  const [showTranslation, setShowTranslation] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [rewards, setRewards] = useState<{ xp: number; gems: number } | null>(null)

  // Stories that give at least two questions
  const playable = useMemo(() => {
    const all = practice.stories.flatMap(s => s.highlighted)
    return practice.stories.filter(s => storyQuestions(s, all).length >= 2)
  }, [practice.stories])

  function pickStory() {
    const choices = playable.filter(s => s.lesson !== story?.lesson)
    const next = (choices.length ? choices : playable)[Math.floor(Math.random() * (choices.length || playable.length))]
    if (!next) return
    setStory(next)
    setQuestions(storyQuestions(next, practice.stories.flatMap(s => s.highlighted)))
    setShowTranslation(false)
    setRewards(null)
    setPhase('reading')
  }

  async function done(n: number) {
    setCorrect(n)
    setPhase('finished')
    setRewards(await saveGameResult(n, questions.length))
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#080a10' }}>
      <AppTopbar title={tm('shortstory_title')} back={{ href: '/mini-games', label: tm('title') }} />

      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        {phase === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-7 mt-6">
            <div className="size-[110px] rounded-[2.25rem] flex items-center justify-center shadow-2xl bg-gradient-to-br from-orange-800 to-orange-600">
              <BookOpen size={52} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">{tm('shortstory_title')}</h1>
              <p className="text-white/50 text-sm max-w-sm">{t('story_intro')}</p>
            </div>
            <SourcePicker tone="dark" className="w-full" />
            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: t('stat_stories'), value: practice.loading ? '…' : String(playable.length) },
                { label: t('stat_questions'), value: `≤ ${MAX_QUESTIONS}` },
                { label: t('stat_reward'), value: '+3 💎' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>
            {!practice.loading && playable.length === 0 && <p className="text-center text-sm text-white/50">{t('no_stories')}</p>}
            <button
              type="button"
              onClick={pickStory}
              disabled={practice.loading || playable.length === 0}
              className="px-10 py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-105 disabled:opacity-40 bg-gradient-to-br from-orange-800 to-orange-600"
            >
              {practice.loading ? t('loading') : t('start_reading')}
            </button>
          </motion.div>
        )}

        {phase === 'reading' && story && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 mt-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{t('lesson_n', { n: story.position })}</p>
              <h2 className="text-2xl font-bold text-orange-400">{story.title}</h2>
            </div>
            <div className="bg-white/[0.04] border border-orange-400/20 rounded-3xl p-6">
              <p className="text-white/90 text-base leading-relaxed"><HighlightedStory story={story} /></p>
              {showTranslation && story.translation && (
                <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/50">{story.translation}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => speak(story.text, languageCode)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/15">
                <Volume2 size={15} /> {t('listen')}
              </button>
              {story.translation && (
                <button type="button" onClick={() => setShowTranslation(v => !v)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/15">
                  {showTranslation ? <EyeOff size={15} /> : <Eye size={15} />} {showTranslation ? t('hide_translation') : t('show_translation')}
                </button>
              )}
            </div>
            <button type="button" onClick={() => setPhase('quiz')} className="w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02] bg-gradient-to-br from-orange-800 to-orange-600">
              {t('read_it')}
            </button>
          </motion.div>
        )}

        {phase === 'quiz' && story && (
          <>
            <p className="text-sm font-bold text-white/60">{t('complete_story')}</p>
            <ChoiceQuiz questions={questions} accent={ACCENT} onDone={done} />
          </>
        )}

        {phase === 'finished' && story && (
          <QuizResult
            title={story.title}
            correct={correct}
            total={questions.length}
            rewards={rewards}
            accent={ACCENT}
            againLabel={t('other_story')}
            onAgain={pickStory}
          />
        )}
      </main>
    </div>
  )
}
