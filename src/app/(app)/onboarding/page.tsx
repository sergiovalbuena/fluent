'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Data ──────────────────────────────────────────────────────────────────────

const NATIVE_LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'German',     flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian',    flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦' },
]

const LEARNING_LANGUAGES = [
  { code: 'es', name: 'Spanish',    flag: '🇪🇸', description: 'Over 500 million speakers' },
  { code: 'fr', name: 'French',     flag: '🇫🇷', description: 'Language of love & culture' },
  { code: 'de', name: 'German',     flag: '🇩🇪', description: 'Language of innovation' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', description: 'Spoken across 3 continents' },
  { code: 'it', name: 'Italian',    flag: '🇮🇹', description: 'Language of art & food' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵', description: 'Unique writing systems' },
]

const MOTIVATIONS = [
  { code: 'travel',  label: 'Travel',  icon: '✈️', description: 'Survive & thrive abroad',   highlight: true },
  { code: 'work',    label: 'Work',    icon: '💼', description: 'Career & business',          highlight: false },
  { code: 'family',  label: 'Family',  icon: '❤️', description: 'Connect with loved ones',   highlight: false },
  { code: 'culture', label: 'Culture', icon: '🎭', description: 'Art, film & music',         highlight: false },
  { code: 'brain',   label: 'Brain',   icon: '🧠', description: 'Keep your mind sharp',      highlight: false },
  { code: 'curious', label: 'Curious', icon: '🌍', description: 'Just exploring',             highlight: false },
]

const DESTINATIONS: Record<string, { name: string; flag: string }[]> = {
  es: [
    { name: 'Mexico',        flag: '🇲🇽' }, { name: 'Spain',         flag: '🇪🇸' },
    { name: 'Colombia',      flag: '🇨🇴' }, { name: 'Argentina',     flag: '🇦🇷' },
    { name: 'Peru',          flag: '🇵🇪' }, { name: 'Cuba',          flag: '🇨🇺' },
    { name: 'Costa Rica',    flag: '🇨🇷' }, { name: 'Chile',         flag: '🇨🇱' },
  ],
  fr: [
    { name: 'France',        flag: '🇫🇷' }, { name: 'Canada',        flag: '🇨🇦' },
    { name: 'Belgium',       flag: '🇧🇪' }, { name: 'Switzerland',   flag: '🇨🇭' },
    { name: 'Morocco',       flag: '🇲🇦' }, { name: 'Senegal',       flag: '🇸🇳' },
  ],
  de: [
    { name: 'Germany',       flag: '🇩🇪' }, { name: 'Austria',       flag: '🇦🇹' },
    { name: 'Switzerland',   flag: '🇨🇭' }, { name: 'Luxembourg',    flag: '🇱🇺' },
  ],
  pt: [
    { name: 'Brazil',        flag: '🇧🇷' }, { name: 'Portugal',      flag: '🇵🇹' },
    { name: 'Cape Verde',    flag: '🇨🇻' }, { name: 'Mozambique',    flag: '🇲🇿' },
  ],
  it: [
    { name: 'Italy',         flag: '🇮🇹' }, { name: 'Vatican',       flag: '🇻🇦' },
    { name: 'San Marino',    flag: '🇸🇲' }, { name: 'Switzerland',   flag: '🇨🇭' },
  ],
  ja: [
    { name: 'Japan',         flag: '🇯🇵' },
  ],
}

const TRIP_TIMELINES = [
  { code: 'week',    label: 'This week',      emoji: '🔥', urgency: 'ultra' },
  { code: 'month',   label: 'In 2–4 weeks',   emoji: '⚡', urgency: 'high'  },
  { code: 'quarter', label: 'In 1–3 months',  emoji: '📅', urgency: 'mid'   },
  { code: 'later',   label: 'In 3+ months',   emoji: '🌱', urgency: 'low'   },
  { code: 'there',   label: "Already there!", emoji: '😅', urgency: 'ultra' },
]

type SurvivalPhrase = {
  emoji: string
  phrase: string
  phonetic: string
  translation: string
}

const SURVIVAL_PHRASES: Record<string, SurvivalPhrase[]> = {
  es: [
    { emoji: '🚽', phrase: '¿Dónde está el baño?',       phonetic: 'don-de es-ta el ba-nyo',          translation: 'Where is the bathroom?' },
    { emoji: '💰', phrase: '¿Cuánto cuesta esto?',        phonetic: 'kwan-to kwes-ta es-to',           translation: 'How much is this?' },
    { emoji: '🙏', phrase: 'No hablo español bien.',      phonetic: 'no ab-lo es-pan-yol byen',        translation: "I don't speak Spanish well." },
    { emoji: '🆘', phrase: '¿Me puede ayudar?',           phonetic: 'me pwe-de a-yu-dar',              translation: 'Can you help me?' },
    { emoji: '🍽️', phrase: 'La cuenta, por favor.',       phonetic: 'la kwen-ta por fa-bor',           translation: 'The bill, please.' },
  ],
  fr: [
    { emoji: '🚽', phrase: 'Où sont les toilettes ?',     phonetic: 'oo son lay twa-let',              translation: 'Where is the bathroom?' },
    { emoji: '💰', phrase: 'Combien ça coûte ?',          phonetic: 'kom-byan sa koot',                translation: 'How much is this?' },
    { emoji: '🙏', phrase: 'Je ne parle pas bien français.', phonetic: 'zhuh nuh parl pa byan fran-say', translation: "I don't speak French well." },
    { emoji: '🆘', phrase: 'Pouvez-vous m\'aider ?',      phonetic: 'poo-vay voo may-day',             translation: 'Can you help me?' },
    { emoji: '🍽️', phrase: "L'addition, s'il vous plaît.", phonetic: 'la-dee-syon seel voo play',      translation: 'The bill, please.' },
  ],
  de: [
    { emoji: '🚽', phrase: 'Wo ist die Toilette?',        phonetic: 'vo ist dee toy-le-te',            translation: 'Where is the bathroom?' },
    { emoji: '💰', phrase: 'Wie viel kostet das?',         phonetic: 'vee feel kos-tet das',            translation: 'How much is this?' },
    { emoji: '🙏', phrase: 'Ich spreche nicht gut Deutsch.', phonetic: 'ikh shpre-khe nikht goot doytsh', translation: "I don't speak German well." },
    { emoji: '🆘', phrase: 'Können Sie mir helfen?',      phonetic: 'kö-nen zee meer hel-fen',         translation: 'Can you help me?' },
    { emoji: '🍽️', phrase: 'Die Rechnung, bitte.',        phonetic: 'dee rekh-noong bi-te',            translation: 'The bill, please.' },
  ],
  pt: [
    { emoji: '🚽', phrase: 'Onde fica o banheiro?',       phonetic: 'on-de fee-ka o ban-yey-ro',       translation: 'Where is the bathroom?' },
    { emoji: '💰', phrase: 'Quanto custa isso?',           phonetic: 'kwan-to koos-ta ee-so',           translation: 'How much is this?' },
    { emoji: '🙏', phrase: 'Não falo português bem.',      phonetic: 'now fa-lo por-too-gez ben',       translation: "I don't speak Portuguese well." },
    { emoji: '🆘', phrase: 'Pode me ajudar?',              phonetic: 'po-de me a-zhoo-dar',             translation: 'Can you help me?' },
    { emoji: '🍽️', phrase: 'A conta, por favor.',         phonetic: 'a kon-ta por fa-vor',             translation: 'The bill, please.' },
  ],
  it: [
    { emoji: '🚽', phrase: "Dov'è il bagno?",             phonetic: 'do-ve il ban-yo',                 translation: 'Where is the bathroom?' },
    { emoji: '💰', phrase: 'Quanto costa questo?',         phonetic: 'kwan-to kos-ta kwes-to',          translation: 'How much is this?' },
    { emoji: '🙏', phrase: "Non parlo bene l'italiano.",   phonetic: 'non par-lo be-ne lee-ta-lya-no', translation: "I don't speak Italian well." },
    { emoji: '🆘', phrase: 'Può aiutarmi?',               phonetic: 'pwo a-yoo-tar-mi',                translation: 'Can you help me?' },
    { emoji: '🍽️', phrase: 'Il conto, per favore.',       phonetic: 'il kon-to per fa-vo-re',          translation: 'The bill, please.' },
  ],
  ja: [
    { emoji: '🚽', phrase: 'トイレはどこですか？',           phonetic: 'to-i-re wa do-ko des-ka',         translation: 'Where is the bathroom?' },
    { emoji: '💰', phrase: 'これはいくらですか？',           phonetic: 'ko-re wa i-ku-ra des-ka',         translation: 'How much is this?' },
    { emoji: '🙏', phrase: '日本語があまり話せません。',      phonetic: 'ni-hon-go ga a-ma-ri ha-na-se-ma-sen', translation: "I don't speak Japanese well." },
    { emoji: '🆘', phrase: '助けてください。',               phonetic: 'ta-su-ke-te ku-da-sa-i',          translation: 'Please help me.' },
    { emoji: '🍽️', phrase: 'お会計をお願いします。',         phonetic: 'o-kai-kei o o-ne-gai-shi-mas',   translation: 'The bill, please.' },
  ],
}

const DAILY_GOALS = [
  { minutes: 5,  label: 'Casual',    description: '5 min / day',  emoji: '🌱' },
  { minutes: 10, label: 'Regular',   description: '10 min / day', emoji: '🔥', recommended: true },
  { minutes: 20, label: 'Intensive', description: '20 min / day', emoji: '⚡' },
]

const REMINDER_TIMES = [
  { time: '7:00 AM',  label: 'Early Bird', icon: '🌅' },
  { time: '8:00 AM',  label: 'Morning',    icon: '☀️' },
  { time: '12:00 PM', label: 'Midday',     icon: '🌤️' },
  { time: '6:00 PM',  label: 'After Work', icon: '🌆' },
  { time: '8:00 PM',  label: 'Evening',    icon: '🌙' },
  { time: '10:00 PM', label: 'Night Owl',  icon: '🦉' },
]

// ── Step config ───────────────────────────────────────────────────────────────

type StepKey = 'native' | 'learn' | 'motivation' | 'destination' | 'timeline' | 'kit' | 'goal' | 'reminder'

const ALL_STEPS: StepKey[] = ['native', 'learn', 'motivation', 'destination', 'timeline', 'kit', 'goal', 'reminder']
const NON_TRAVEL_STEPS: StepKey[] = ['native', 'learn', 'motivation', 'kit', 'goal', 'reminder']

const STEP_META: Record<StepKey, { emoji: string; title: string; subtitle: string }> = {
  native:      { emoji: '🌏', title: "What's your native language?",  subtitle: "We'll adapt the content for you" },
  learn:       { emoji: '📚', title: 'What do you want to learn?',    subtitle: "Pick the language you're excited about" },
  motivation:  { emoji: '⚡', title: "What's driving you?",           subtitle: 'Knowing your why shapes your entire experience' },
  destination: { emoji: '✈️', title: 'Where are you headed?',         subtitle: "We'll tailor your survival kit to your destination" },
  timeline:    { emoji: '📅', title: 'When is your trip?',            subtitle: "We'll set the right pace based on your timeline" },
  kit:         { emoji: '🆘', title: 'Your Survival Kit',             subtitle: 'The 5 phrases that will save you. Learn them now.' },
  goal:        { emoji: '🎯', title: 'Set your daily goal',           subtitle: 'Consistency beats intensity — pick what fits your life' },
  reminder:    { emoji: '⏰', title: 'When should we remind you?',    subtitle: "We'll send a gentle nudge at your chosen time" },
}

// ── Animations ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

// ── Survival Kit Card ─────────────────────────────────────────────────────────

function PhraseCard({ phrase, index, revealed, onReveal }: {
  phrase: SurvivalPhrase
  index: number
  revealed: boolean
  onReveal: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onReveal}
      className={cn(
        'w-full rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 text-left',
        revealed
          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none shrink-0 mt-0.5">{phrase.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-slate-900 dark:text-white leading-tight">{phrase.phrase}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tracking-wide">{phrase.phonetic}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{phrase.translation}</p>
        </div>
        <div className="shrink-0 mt-0.5">
          {revealed ? (
            <div className="size-6 rounded-full bg-primary flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          ) : (
            <div className="size-6 rounded-full border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center">
              <Volume2 size={11} className="text-slate-400" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [stepIdx, setStepIdx]               = useState(0)
  const [direction, setDirection]           = useState(1)
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [motivation, setMotivation]         = useState('')
  const [destination, setDestination]       = useState('')
  const [tripTimeline, setTripTimeline]     = useState('')
  const [revealedPhrases, setRevealedPhrases] = useState<Set<number>>(new Set())
  const [dailyGoal, setDailyGoal]           = useState(10)
  const [reminderTime, setReminderTime]     = useState('8:00 AM')
  const [saving, setSaving]                 = useState(false)

  const isTravel = motivation === 'travel'
  const steps: StepKey[] = isTravel ? ALL_STEPS : NON_TRAVEL_STEPS
  const currentKey = steps[stepIdx]
  const meta = STEP_META[currentKey]
  const phrases = SURVIVAL_PHRASES[learningLanguage] ?? SURVIVAL_PHRASES['es']

  function goNext() {
    setDirection(1)
    setStepIdx(s => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStepIdx(s => s - 1)
  }

  // When motivation changes, reset travel-specific fields & recompute index
  function selectMotivation(code: string) {
    setMotivation(code)
    setDestination('')
    setTripTimeline('')
    setRevealedPhrases(new Set())
  }

  const canContinue: boolean = (() => {
    switch (currentKey) {
      case 'native':      return !!nativeLanguage
      case 'learn':       return !!learningLanguage
      case 'motivation':  return !!motivation
      case 'destination': return !!destination
      case 'timeline':    return !!tripTimeline
      case 'kit':         return revealedPhrases.size >= phrases.length
      case 'goal':        return true
      case 'reminder':    return true
    }
  })()

  function revealPhrase(i: number) {
    setRevealedPhrases(prev => new Set([...prev, i]))
  }

  async function handleComplete() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      native_language_code: nativeLanguage,
      motivation,
      daily_goal_minutes: dailyGoal,
      reminder_time: reminderTime,
      travel_destination: isTravel ? destination : null,
      travel_date: null,
      display_name: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Learner',
      streak_count: 0,
      longest_streak: 0,
      total_xp: 0,
    }, { onConflict: 'user_id' })

    if (profileError) { toast.error('Failed to save profile'); setSaving(false); return }

    await supabase.from('user_languages').update({ is_active: false }).eq('user_id', user.id)

    const { error: langError } = await supabase.from('user_languages').upsert({
      user_id: user.id,
      language_code: learningLanguage,
      is_active: true,
      is_unlocked: true,
    }, { onConflict: 'user_id,language_code' })

    if (langError) { toast.error('Failed to save language preference'); setSaving(false); return }

    toast.success("You're all set! Let's start learning. 🚀")
    router.push('/learn')
  }

  const isLast = stepIdx === steps.length - 1
  const destinations = DESTINATIONS[learningLanguage] ?? []

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">

      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <div className="flex justify-center mb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentKey}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className={cn(
                'size-16 rounded-2xl flex items-center justify-center text-3xl',
                currentKey === 'kit'
                  ? 'bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/30'
                  : 'bg-primary/10'
              )}
            >
              {meta.emoji}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold leading-tight">{meta.title}</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{meta.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress pills */}
      <div className="flex justify-center gap-1.5 mb-5 px-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i <= stepIdx ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700',
              i === stepIdx ? 'w-8' : 'w-4'
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentKey}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto px-4 pb-4"
          >

            {/* STEP: Native language */}
            {currentKey === 'native' && (
              <div className="space-y-2">
                {NATIVE_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setNativeLanguage(lang.code)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
                      nativeLanguage === lang.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-semibold flex-1 text-left text-sm">{lang.name}</span>
                    {nativeLanguage === lang.code && (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Learning language */}
            {currentKey === 'learn' && (
              <div className="grid grid-cols-2 gap-3">
                {LEARNING_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLearningLanguage(lang.code)}
                    disabled={lang.code === nativeLanguage}
                    className={cn(
                      'flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all',
                      learningLanguage === lang.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : lang.code === nativeLanguage
                        ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/20 opacity-30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    <span className="text-3xl">{lang.flag}</span>
                    <p className="font-bold text-sm">{lang.name}</p>
                    <p className="text-[11px] text-muted-foreground text-center leading-tight">{lang.description}</p>
                    {learningLanguage === lang.code && (
                      <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Motivation */}
            {currentKey === 'motivation' && (
              <div className="grid grid-cols-2 gap-3">
                {MOTIVATIONS.map(m => (
                  <button
                    key={m.code}
                    onClick={() => selectMotivation(m.code)}
                    className={cn(
                      'relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all',
                      motivation === m.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    {m.highlight && (
                      <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <span className="text-3xl">{m.icon}</span>
                    <div className="text-center">
                      <p className="font-bold text-sm">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>
                    </div>
                    {motivation === m.code && (
                      <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Destination (travel only) */}
            {currentKey === 'destination' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {destinations.map(d => (
                    <button
                      key={d.name}
                      onClick={() => setDestination(d.name)}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                        destination === d.name
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                      )}
                    >
                      <span className="text-2xl">{d.flag}</span>
                      <span className="font-semibold text-sm flex-1 text-left">{d.name}</span>
                      {destination === d.name && (
                        <div className="size-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Other destination input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Other destination..."
                    value={destinations.some(d => d.name === destination) ? '' : destination}
                    onChange={e => setDestination(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {/* STEP: Trip timeline (travel only) */}
            {currentKey === 'timeline' && (
              <div className="space-y-3 max-w-sm mx-auto">
                {TRIP_TIMELINES.map(t => (
                  <button
                    key={t.code}
                    onClick={() => setTripTimeline(t.code)}
                    className={cn(
                      'relative w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all',
                      tripTimeline === t.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    {(t.urgency === 'ultra' || t.urgency === 'high') && (
                      <span className="absolute top-2.5 right-3 text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {t.urgency === 'ultra' ? 'Urgent!' : 'Soon'}
                      </span>
                    )}
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="font-bold text-sm flex-1 text-left">{t.label}</span>
                    {tripTimeline === t.code && (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Survival Kit */}
            {currentKey === 'kit' && (
              <div className="space-y-2.5 max-w-sm mx-auto">
                {/* Context banner */}
                <div className="flex items-start gap-2.5 bg-primary/8 border border-primary/15 rounded-2xl p-3.5 mb-4">
                  <span className="text-lg shrink-0">👆</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tap each phrase to mark it learned. These 5 phrases cover{' '}
                    <span className="font-bold text-foreground">80% of emergency situations</span> abroad.
                  </p>
                </div>

                {phrases.map((phrase, i) => (
                  <PhraseCard
                    key={i}
                    phrase={phrase}
                    index={i}
                    revealed={revealedPhrases.has(i)}
                    onReveal={() => revealPhrase(i)}
                  />
                ))}

                {/* Progress indicator */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${(revealedPhrases.size / phrases.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-primary tabular-nums shrink-0">
                    {revealedPhrases.size}/{phrases.length}
                  </span>
                </div>

                {revealedPhrases.size === phrases.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-3.5"
                  >
                    <span className="text-lg">🎉</span>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">
                      You already know your first 5 phrases. You're ready to travel!
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* STEP: Daily goal */}
            {currentKey === 'goal' && (
              <div className="space-y-3 max-w-sm mx-auto">
                {DAILY_GOALS.map(g => (
                  <button
                    key={g.minutes}
                    onClick={() => setDailyGoal(g.minutes)}
                    className={cn(
                      'relative w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all',
                      dailyGoal === g.minutes
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    {g.recommended && (
                      <span className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">{g.label}</p>
                      <p className="text-xs text-muted-foreground">{g.description}</p>
                    </div>
                    {dailyGoal === g.minutes && (
                      <div className="ml-auto size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}

                <div className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-2xl p-4">
                  <span className="text-lg mt-0.5">💡</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Even 5 minutes a day adds up to over 30 hours of practice per year. Consistency is the key to fluency.
                  </p>
                </div>
              </div>
            )}

            {/* STEP: Reminder */}
            {currentKey === 'reminder' && (
              <div className="space-y-3 max-w-sm mx-auto">
                <div className="grid grid-cols-2 gap-3">
                  {REMINDER_TIMES.map(r => (
                    <button
                      key={r.time}
                      onClick={() => setReminderTime(r.time)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                        reminderTime === r.time
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                      )}
                    >
                      <span className="text-2xl">{r.icon}</span>
                      <div className="text-center">
                        <p className="font-bold text-sm">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.time}</p>
                      </div>
                      {reminderTime === r.time && (
                        <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setReminderTime('Off')}
                  className={cn(
                    'w-full p-4 rounded-2xl border-2 transition-all text-sm font-medium text-muted-foreground',
                    reminderTime === 'Off'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                  )}
                >
                  🔕 &nbsp; Skip reminders for now
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="p-4 pt-2 border-t border-primary/10 space-y-2">
        {isLast ? (
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl h-13 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {saving ? 'Setting up...' : "Let's Start Learning 🚀"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 rounded-2xl h-13 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentKey === 'kit' && revealedPhrases.size < phrases.length
              ? `Tap all phrases (${revealedPhrases.size}/${phrases.length})`
              : 'Continue'
            }
            {(currentKey !== 'kit' || revealedPhrases.size === phrases.length) && (
              <ChevronRight size={18} />
            )}
          </button>
        )}

        {stepIdx > 0 && (
          <button
            onClick={goBack}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground py-2"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}
      </div>

    </div>
  )
}
