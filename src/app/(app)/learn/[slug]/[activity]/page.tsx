'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, ArrowRight, Check, X, RotateCcw, BookOpen, MessageSquare, HelpCircle, BookMarked, PenLine, Headphones, Bookmark, Zap, Languages, FileText, Mic } from 'lucide-react'
import { useSavedItems } from '@/hooks/use-saved-items'
import { useVocabMastery } from '@/hooks/use-vocab-mastery'
import Link from 'next/link'
import { AppTopbar } from '@/components/layout/app-topbar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { speak, type SpeechHandle } from '@/lib/languages'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { useLocale, useTranslations } from 'next-intl'
import { addXp, getActiveBoosts } from '@/lib/rewards'
import { recordActivity } from '@/lib/activity'
import { ResultScreen } from '@/components/lesson/result-screen'
import { SpeakModal } from '@/components/lesson/speak-modal'
import { speechAvailable } from '@/lib/speech'
import { AllItemsDialog } from '@/components/lesson/all-items-dialog'
import { HINT_AREA, SectionTitle, TitleHintProvider } from '@/components/lesson/title-hint'
import type { SectionTitleKey } from '@/lib/section-titles'
import { useTitleHintSettings } from '@/lib/title-hints'
import { getAuthUser } from '@/lib/supabase/auth'
import { trackEvent } from '@/lib/analytics'
import { type LessonContent, type RawContent, fuzzyMatch, normalizeContent, shuffleArray } from '@/components/lesson/player/content'
import { Block } from '@/components/lesson/player/block'
import { StoryChallengeModal, splitStory } from '@/components/lesson/player/story-challenge-modal'
import { PhraseList, type PracticeRequest, QAQuestionList, VocabWordList, speakWord } from '@/components/lesson/player/item-lists'
import { ACTIVITIES, ActivityHero, type ActivityHeroCta, AllItemsCard, COLOR_CORRECT, COLOR_INCORRECT, CompletionCard, EmptyState, activityTabs } from '@/components/lesson/player/activity-hero'

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

type SpeakItem = { text: string; translation: string }

export default function LessonPage() {
  const tLessonTop = useTranslations('lesson')
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

  // Pronunciation practice (Mots and Phrases, courses listed in NEXT_PUBLIC_SPEECH_LANGUAGES).
  // Typing every item gives 2 stars; saying them all well out loud too gives the 3rd.
  const speechOn = speechAvailable(languageCode) && (activity === 'vocabulary' || activity === 'phrases')
  const { isMastered: isSpoken, markMastered: markSpoken } = useVocabMastery(
    speechOn ? languageCode : '',
    activity === 'phrases' ? 'say:phrase' : 'say:word',
  )
  const speakItems: SpeakItem[] = !speechOn || !lesson ? []
    : activity === 'phrases'
      ? (lesson.content.phrases ?? []).map(p => ({ text: p.phrase, translation: p.translation }))
      : (lesson.content.words ?? []).map(w => ({ text: w.word, translation: w.translation }))
  const spokenCount = speakItems.filter(i => isSpoken(i.text)).length
  const [speakItem,  setSpeakItem]  = useState<SpeakItem | null>(null)
  const [speakQueue, setSpeakQueue] = useState<{ items: SpeakItem[]; index: number } | null>(null)
  function startSpeaking() {
    // Continue with the ones not said yet; once all are, go through them all again
    const pending = speakItems.filter(i => !isSpoken(i.text))
    setSpeakQueue({ items: pending.length > 0 ? pending : speakItems, index: 0 })
  }
  function nextSpeak() {
    setSpeakQueue(q => {
      if (!q) return null
      if (q.index + 1 >= q.items.length) {
        toast.success(tLessonTop('speak_done', { done: speakItems.filter(i => isSpoken(i.text)).length, total: speakItems.length }))
        return null
      }
      return { ...q, index: q.index + 1 }
    })
  }

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
  const [allItemsOpen,        setAllItemsOpen]        = useState(false)
  const uiLocale = useLocale()
  const [moduleOrder,         setModuleOrder]         = useState<number | null>(null)
  const titleHints = useTitleHintSettings()

  /** Hero card for the typing practice (mastery): "Writing" in the course language, progress as numbers */
  function masteryCta(done: number, total: number, start: (req: PracticeRequest) => void): ActivityHeroCta {
    const inProgress = done > 0 && done < total
    return {
      icon: PenLine,
      label: <SectionTitle k="writing" />,
      sublabel: `${done} / ${total}`,
      progress: total > 0 ? done / total : 0,
      onClick: () => start({ mode: inProgress ? 'resume' : 'all', key: Date.now() }),
    }
  }

  /** Twin hero card for pronunciation, shown next to Writing when it's available */
  function speakCta(): ActivityHeroCta {
    return {
      icon: Mic,
      tone: 'violet',
      label: <SectionTitle k="pronunciation" />,
      sublabel: `${spokenCount} / ${speakItems.length}`,
      progress: speakItems.length > 0 ? spokenCount / speakItems.length : 0,
      onClick: startSpeaking,
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
  const [qaShowTr,     setQaShowTr]     = useState(false)

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
        .select('id, language_code, title, order_index')
        .eq('slug', slug)
        .eq('language_code', activeLanguage)
        .limit(1)
        .maybeSingle()

      if (!mod) { setLoading(false); return }
      setLanguageCode(mod.language_code)
      setModuleTitle(mod.title)
      setModuleOrder(mod.order_index)

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

  // Vocabulary, phrases and Q&A count as completed once every item is mastered (the
  // practice from the hero, or one by one). Opening the page alone must not award
  // progress, and an activity already completed is not saved again (that would add
  // an attempt and repeat gems on every visit).
  const masterySavedRef = useRef<Set<string>>(new Set())
  const masteryTotal =
    activity === 'vocabulary' ? (lesson?.content.words?.length ?? 0)
    : activity === 'phrases' ? (lesson?.content.phrases?.length ?? 0)
    : activity === 'qa' ? (lesson?.content.sentences?.length || lesson?.content.questions?.length || 0)
    : 0
  const masteryDone =
    activity === 'vocabulary' ? masteredCount
    : activity === 'phrases' ? masteredPhraseCount
    : activity === 'qa' ? masteredQACount
    : 0
  // With pronunciation on, typing everything is 2 stars and saying everything too is 3
  // ("<activity>:speak" in activities_completed records the second part, saved once).
  const speakAllDone = speechOn && masteryTotal > 0 && spokenCount >= masteryTotal
  useEffect(() => {
    if (!lessonId) return
    if (masteryTotal === 0 || masteryDone < masteryTotal) return
    const speakMarker = `${activity}:speak`
    const wanted = [activity, ...(speakAllDone ? [speakMarker] : [])].filter(m => !masterySavedRef.current.has(m))
    if (wanted.length === 0) return
    wanted.forEach(m => masterySavedRef.current.add(m))
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await getAuthUser(supabase)
      if (!user) return
      const { data: existing } = await supabase
        .from('user_progress')
        .select('activities_completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()
      const done = (existing?.activities_completed ?? []) as string[]
      const markers = wanted.filter(m => !done.includes(m))
      if (markers.length === 0) return
      const stars = !speechOn || speakAllDone ? 3 : 2
      await saveProgress(100, { stars, markers })
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, masteryTotal, masteryDone, speakAllDone])

  // ── DB helpers ────────────────────────────────────────────────────────────

  /** opts.stars overrides the score-based stars; opts.markers are added to activities_completed (default: the activity) */
  async function saveProgress(
    score: number,
    opts: { stars?: 1 | 2 | 3; markers?: string[] } = {},
  ): Promise<{ stars: 1 | 2 | 3; gems: number; isFirstCompletion: boolean }> {
    const supabase = createClient()
    const { data: { user } } = await getAuthUser(supabase)

    const fallbackStars = opts.stars ?? calcStars(score)
    if (!user || !lessonId || !moduleId) {
      console.warn('[saveProgress] skipped — missing context', { hasUser: !!user, lessonId, moduleId })
      return { stars: fallbackStars, gems: calcGems(score, false), isFirstCompletion: true }
    }

    // The database checks the lesson is open, computes the stars and credits the gems
    // (+1 repeat, +2 perfect) and today's lesson count: see save_activity_progress
    const { data, error } = await supabase.rpc('save_activity_progress', {
      p_lesson: lessonId,
      p_score: score,
      p_stars: opts.stars ?? null,
      p_markers: opts.markers ?? null,
    })
    if (error || !data) {
      console.error('[saveProgress] failed:', error?.message)
      toast.error('Could not save progress' + (error ? ' — ' + error.message : ''))
      return { stars: fallbackStars, gems: 0, isFirstCompletion: false }
    }
    const saved = data as { stars: number; gems: number; first_completion: boolean }
    const finalStars = Math.min(3, Math.max(1, saved.stars)) as 1 | 2 | 3
    const newGems = saved.gems
    const isFirstCompletion = saved.first_completion

    trackEvent('activity_completed', { course: languageCode, activity, first: isFirstCompletion })

    return { stars: finalStars, gems: newGems, isFirstCompletion }
  }

  async function updateXpAndStreak(
    score: number,
    gemsEarned: number,
    stars: 1 | 2 | 3,
    isFirstCompletion: boolean,
  ): Promise<{ xpEarned: number; gemsEarned: number; milestoneBonusXp: number }> {
    const supabase = createClient()
    const { data: { user } } = await getAuthUser(supabase)
    if (!user) return { xpEarned: 10, gemsEarned, milestoneBonusXp: 0 }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('skills')
      .eq('user_id', user.id)
      .maybeSingle()

    // The database moves the streak for the learner's local day, spends a streak
    // freeze if one day was missed and credits the milestone bonus (record_activity)
    const day = await recordActivity(supabase)
    if (day.frozen) toast.success(tLesson('streak_frozen'))

    // XP formula v1
    let xpEarned = 10                          // core activity
    if (isFirstCompletion) xpEarned += 20      // lesson completion bonus
    if (stars === 3)       xpEarned += 10      // 3-star bonus
    if (day.newDay)        xpEarned += 5       // streak day bonus

    // Active boost (bought in the gem shop): 2× XP
    if ((await getActiveBoosts(supabase, user.id)).xp) xpEarned *= 2

    // Streak milestone bonus (3, 7, 14 days): already credited by the database
    const milestoneBonusXp = day.milestoneXp

    // Skill gains
    const skillGains     = SKILL_MAP[activity] ?? {}
    const currentSkills  = (profile?.skills ?? { speaking: 0, vocabulary: 0, listening: 0, grammar: 0 }) as Record<string, number>
    const updatedSkills  = {
      speaking:   (currentSkills.speaking   ?? 0) + (skillGains.speaking   ?? 0),
      vocabulary: (currentSkills.vocabulary ?? 0) + (skillGains.vocabulary ?? 0),
      listening:  (currentSkills.listening  ?? 0) + (skillGains.listening  ?? 0),
      grammar:    (currentSkills.grammar    ?? 0) + (skillGains.grammar    ?? 0),
    }

    // XP goes through add_xp (atomic, also today's user_activity.xp_earned)
    await addXp(supabase, xpEarned)
    await supabase.from('user_profiles').update({ skills: updatedSkills }).eq('user_id', user.id)

    return { xpEarned: xpEarned + milestoneBonusXp, gemsEarned, milestoneBonusXp }
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
  const phrases   = content.phrases   ?? []
  const questions = content.questions ?? []
  const sentences = content.sentences ?? []
  // Tab title of the Q&A activity: "Sentences" once this lesson is converted
  const qaTitle: SectionTitleKey = sentences.length > 0 ? 'sentences' : 'qa'
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
    const isCorrect = fuzzyMatch(translateInput, [item.answer, ...(item.accept ?? [])], languageCode)
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
        <AppTopbar back={{ href: `/learn/${slug}`, label: moduleTitle || lesson.title, subtle: true }} />
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

  const titleHintSettings = {
    lang: languageCode,
    hintLang: uiLocale,
    active: titleHints.enabled && moduleOrder != null && moduleOrder <= titleHints.untilLesson,
  }

  return (
    <TitleHintProvider value={titleHintSettings}>
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#1b2030]">
      <AppTopbar back={{ href: `/learn/${slug}`, label: moduleTitle || lesson.title, subtle: true }} />


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
              badgeLabel={<SectionTitle k="vocabulary" />}
              title={moduleTitle}
              titleHref={`/learn/${slug}`}
              badgeColorClass="text-indigo-500 bg-indigo-500/10"
              cta={speechOn ? [masteryCta(masteredCount, words.length, setPractice), speakCta()] : masteryCta(masteredCount, words.length, setPractice)}
              activities={activityTabs(slug, 'vocabulary', qaTitle)}
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
                isSpoken={speechOn ? isSpoken : undefined}
                onSpeak={speechOn ? (e) => setSpeakItem({ text: e.word, translation: e.translation }) : undefined}
              />
            </Block>

            {/* ── ALL WORDS — two versions to compare: dialog (A) vs. own page (B) ── */}
            <AllItemsCard
              titleKey="all_words"
              onClick={() => setAllItemsOpen(true)}
              iconClass="text-indigo-500"
              iconBgClass="bg-indigo-500/10"
              className="col-span-6 md:col-span-3"
            />
            <AllItemsDialog
              open={allItemsOpen}
              onOpenChange={setAllItemsOpen}
              title={moduleTitle}
              description={tLesson('ov_count_words', { count: words.length })}
              entries={words}
              languageCode={languageCode}
            />

            <Block
              whileHover={{ rotate: '1.5deg', scale: 1.03 }}
              className="col-span-6 md:col-span-3 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            >
              <Link href={`/learn/${slug}/words`} className="flex h-full w-full items-center gap-3 p-4">
                <span className="size-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <FileText size={18} className="text-indigo-500" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white"><SectionTitle k="word_sheet" /></span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">{tLesson('ov_full_page')}</span>
                </span>
              </Link>
            </Block>

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
                badgeLabel={<SectionTitle k="phrases" />}
                title={moduleTitle}
                titleHref={`/learn/${slug}`}
                badgeColorClass="text-teal-600 dark:text-teal-400 bg-teal-500/10"
                cta={speechOn ? [masteryCta(masteredPhraseCount, phrases.length, setPhrasePractice), speakCta()] : masteryCta(masteredPhraseCount, phrases.length, setPhrasePractice)}
                activities={activityTabs(slug, 'phrases', qaTitle)}
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
                  isSpoken={speechOn ? isSpoken : undefined}
                  onSpeak={speechOn ? (p) => setSpeakItem({ text: p.phrase, translation: p.translation }) : undefined}
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
                    <p className="font-bold text-sm text-white"><SectionTitle k="practice" /></p>
                    <p className="text-[11px] text-white/60 mt-0.5">{tLesson('ov_flip_review')}</p>
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
                    <p className="font-bold text-sm text-white"><SectionTitle k="listening" /></p>
                    <p className="text-[11px] text-white/60 mt-0.5">{tLesson('ov_hear_identify')}</p>
                  </div>
                </button>
              </Block>

              <AllItemsCard
                titleKey="all_phrases"
                onClick={() => setAllItemsOpen(true)}
                iconClass="text-teal-600 dark:text-teal-400"
                iconBgClass="bg-teal-500/10"
                className="col-span-12 md:col-span-6"
              />
              <AllItemsDialog
                open={allItemsOpen}
                onOpenChange={setAllItemsOpen}
                title={moduleTitle}
                description={tLesson('ov_count_phrases', { count: phrases.length })}
                entries={phrases.map(p => ({ word: p.phrase, translation: p.translation }))}
                languageCode={languageCode}
                columns={1}
              />

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

      {/* ── SENTENCES — converted Q&A: repeated like phrases, no quiz ───────── */}
      {activity === 'qa' && sentences.length > 0 && (
        <div className="flex-1 px-3 md:px-5 py-4 md:py-6 overflow-y-auto">
          <motion.div
            initial="initial"
            animate="animate"
            transition={{ staggerChildren: 0.05 }}
            className="max-w-6xl mx-auto grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
          >
            <ActivityHero
              icon={HelpCircle}
              iconColorClass="text-violet-500"
              badgeLabel={<SectionTitle k="sentences" />}
              title={moduleTitle}
              titleHref={`/learn/${slug}`}
              badgeColorClass="text-violet-500 bg-violet-500/10"
              cta={masteryCta(masteredQACount, sentences.length, setQaPractice)}
              activities={activityTabs(slug, 'qa', qaTitle)}
            />

            {/* Sentence list */}
            <Block whileTap={{}} className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
              <PhraseList
                kind="sentences"
                phrases={sentences}
                onPractice={() => setQaPractice({ mode: masteredQACount > 0 && masteredQACount < sentences.length ? 'resume' : 'all', key: Date.now() })}
                isSaved={isSaved}
                onToggleBookmark={(item) => toggleSaved({ ...item, languageCode })}
                languageCode={languageCode}
                onMasteredCountChange={setMasteredQACount}
                practice={qaPractice}
                onPracticeEnd={() => setQaPractice(null)}
              />
            </Block>

            <AllItemsCard
              titleKey="all_sentences"
              onClick={() => setAllItemsOpen(true)}
              iconClass="text-violet-500"
              iconBgClass="bg-violet-500/10"
              className="col-span-12 md:col-span-6"
            />
            <AllItemsDialog
              open={allItemsOpen}
              onOpenChange={setAllItemsOpen}
              title={moduleTitle}
              description={tLesson('ov_count_sentences', { count: sentences.length })}
              entries={sentences.map(x => ({ word: x.phrase, translation: x.translation }))}
              languageCode={languageCode}
              columns={1}
            />
          </motion.div>
        </div>
      )}

      {/* ── Q&A — BENTO OVERVIEW ─────────────────────────────────────────────── */}
      {activity === 'qa' && sentences.length === 0 && qaMode === 'overview' && (
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
                badgeLabel={<SectionTitle k="qa" />}
                title={moduleTitle}
                titleHref={`/learn/${slug}`}
                badgeColorClass="text-violet-500 bg-violet-500/10"
                cta={masteryCta(masteredQACount, questions.length, setQaPractice)}
                activities={activityTabs(slug, 'qa', qaTitle)}
              />

              {/* Questions list */}
              <Block whileTap={{}} className="col-span-12 md:col-span-6 md:row-span-4 p-0 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col" style={{ height: '34rem' }}>
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
                    <p className="font-bold text-sm text-white"><SectionTitle k="start_quiz" /></p>
                    <p className="text-[11px] text-white/60 mt-0.5">{tLesson('ov_test_yourself')}</p>
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
                    <p className="font-bold text-sm text-white"><SectionTitle k="listening" /></p>
                    <p className="text-[11px] text-white/60 mt-0.5">{tLesson('ov_hear_identify')}</p>
                  </div>
                </button>
              </Block>

              <AllItemsCard
                titleKey="all_questions"
                onClick={() => setAllItemsOpen(true)}
                iconClass="text-violet-500"
                iconBgClass="bg-violet-500/10"
                className="col-span-12 md:col-span-6"
              />
              <AllItemsDialog
                open={allItemsOpen}
                onOpenChange={setAllItemsOpen}
                title={moduleTitle}
                description={tLesson('ov_count_questions', { count: questions.length })}
                entries={questions.map(q => ({ word: q.question, translation: q.options[q.correct] }))}
                languageCode={languageCode}
                columns={1}
              />

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
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-base md:text-lg font-bold leading-snug">{questions[qIndex].question}</p>
                  <button
                    type="button"
                    onClick={() => speakWord(questions[qIndex].question, languageCode)}
                    aria-label={tLesson('listen')}
                    className="shrink-0 p-2 -m-1 rounded-xl text-purple-500 hover:bg-purple-500/15 active:scale-90 transition-all"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                {questions[qIndex].translation && (
                  qaShowTr ? (
                    <p className="mt-2 text-sm italic text-muted-foreground">{questions[qIndex].translation}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setQaShowTr(true)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors"
                    >
                      <Languages size={13} /> {tLesson('show_translation')}
                    </button>
                  )
                )}
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
                    else { setQIndex(i => i + 1); setSelected(null); setChecked(false); setQaShowTr(false) }
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
                badgeLabel={<SectionTitle k="story" />}
                badgeColorClass="text-amber-600 dark:text-amber-400 bg-amber-500/10"
                title={lesson.title}
                cta={{
                  icon: Zap,
                  label: tLesson('story_challenge_start'),
                  sublabel: tLesson('story_challenge_desc', { count: splitStory(content.story).length }),
                  onClick: () => setShowStoryChallenge(true),
                }}
                activities={activityTabs(slug, 'story', qaTitle)}
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
                    <div {...HINT_AREA} className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-primary/5 gap-2 flex-wrap">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400"><SectionTitle k="story" /></p>
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
                    <p className="font-bold text-sm text-white"><SectionTitle k="listening" /></p>
                    <p className="text-[11px] text-white/60 mt-0.5">{tLesson('ov_hear_story')}</p>
                  </div>
                </button>
              </Block>

              {/* Whole story, sentence by sentence */}
              <AllItemsCard
                titleKey="whole_story"
                onClick={() => setAllItemsOpen(true)}
                iconClass="text-amber-600 dark:text-amber-400"
                iconBgClass="bg-amber-500/10"
                className="col-span-12 md:col-span-6"
              />
              <AllItemsDialog
                open={allItemsOpen}
                onOpenChange={setAllItemsOpen}
                title={lesson.title}
                description={tLesson('ov_count_sentences', { count: splitStory(content.story).length })}
                entries={(() => {
                  const translations = content.storyTranslation ? splitStory(content.storyTranslation) : []
                  return splitStory(content.story).map((sentence, i) => ({ word: sentence, translation: translations[i] ?? '' }))
                })()}
                languageCode={languageCode}
                columns={1}
              />

              {/* Key words — left col, row 3 */}
              {(content.highlightedWords?.length ?? 0) > 0 && (
                <Block className="col-span-12 md:col-span-6 md:col-start-1 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3"><SectionTitle k="key_words" /></p>
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3"><SectionTitle k="write_sentence" /></p>
                <textarea
                  value={storyInput}
                  onChange={e => setStoryInput(e.target.value)}
                  placeholder={tLesson('ov_sentence_placeholder')}
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
                  <p className="font-bold text-xs text-white text-center"><SectionTitle k="type_x3" /></p>
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{tLesson('ov_all_done')}</span>
                    <span className="text-xl font-bold text-white">{saving ? 'Saving…' : <><SectionTitle k="finish_lesson" /> 🎉</>}</span>
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

      {/* Pronunciation: one item from a list row, or a run through the list */}
      <AnimatePresence>
        {speakItem && (
          <SpeakModal
            key={`speak-${speakItem.text}`}
            text={speakItem.text}
            translation={speakItem.translation}
            languageCode={languageCode}
            onListen={() => speakWord(speakItem.text, languageCode)}
            onPassed={() => markSpoken(speakItem.text)}
            onClose={() => setSpeakItem(null)}
          />
        )}
        {speakQueue && speakQueue.items[speakQueue.index] && (
          <SpeakModal
            key={`speak-queue-${speakQueue.index}`}
            text={speakQueue.items[speakQueue.index].text}
            translation={speakQueue.items[speakQueue.index].translation}
            languageCode={languageCode}
            onListen={() => speakWord(speakQueue.items[speakQueue.index].text, languageCode)}
            onPassed={() => markSpoken(speakQueue.items[speakQueue.index].text)}
            onClose={() => setSpeakQueue(null)}
            session={{ index: speakQueue.index, total: speakQueue.items.length, onSkip: nextSpeak, onNext: nextSpeak }}
          />
        )}
      </AnimatePresence>
    </div>
    </TitleHintProvider>
  )
}
