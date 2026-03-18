'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Check, ArrowLeft } from 'lucide-react'

const NATIVE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
]

const LEARNING_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸', description: 'Over 500 million speakers' },
  { code: 'fr', name: 'French', flag: '🇫🇷', description: 'Language of love & culture' },
  { code: 'de', name: 'German', flag: '🇩🇪', description: 'Language of innovation' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', description: 'Spoken across 3 continents' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', description: 'Language of art & food' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', description: 'Unique writing systems' },
]

const MOTIVATIONS = [
  { code: 'travel', label: 'Travel', icon: '✈️', description: 'Explore the world' },
  { code: 'work', label: 'Work', icon: '💼', description: 'Career & business' },
  { code: 'family', label: 'Family', icon: '❤️', description: 'Connect with loved ones' },
  { code: 'culture', label: 'Culture', icon: '🎭', description: 'Art, film & music' },
  { code: 'brain', label: 'Brain', icon: '🧠', description: 'Keep mind sharp' },
  { code: 'curious', label: 'Curious', icon: '🌍', description: 'Just exploring' },
]

const DAILY_GOALS = [
  { minutes: 5, label: 'Casual', description: '5 min / day', emoji: '🌱' },
  { minutes: 10, label: 'Regular', description: '10 min / day', emoji: '🔥', recommended: true },
  { minutes: 20, label: 'Intensive', description: '20 min / day', emoji: '⚡' },
]

const STEP_LABELS = ['Language', 'Learning', 'Motivation', 'Goal']

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0-indexed: 0, 1, 2, 3
  const [direction, setDirection] = useState(1)
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [motivation, setMotivation] = useState('')
  const [dailyGoal, setDailyGoal] = useState(10)
  const [saving, setSaving] = useState(false)

  function goNext() {
    setDirection(1)
    setStep(s => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStep(s => s - 1)
  }

  const canContinue = [
    !!nativeLanguage,
    !!learningLanguage,
    !!motivation,
    true,
  ][step]

  async function handleComplete() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      native_language_code: nativeLanguage,
      motivation,
      daily_goal_minutes: dailyGoal,
      display_name: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Learner',
      streak_count: 0,
      longest_streak: 0,
      total_xp: 0,
    }, { onConflict: 'user_id' })

    if (profileError) {
      toast.error('Failed to save profile')
      setSaving(false)
      return
    }

    await supabase
      .from('user_languages')
      .update({ is_active: false })
      .eq('user_id', user.id)

    const { error: langError } = await supabase.from('user_languages').upsert({
      user_id: user.id,
      language_code: learningLanguage,
      is_active: true,
      is_unlocked: true,
    }, { onConflict: 'user_id,language_code' })

    if (langError) {
      toast.error('Failed to save language preference')
      setSaving(false)
      return
    }

    toast.success("You're all set! Let's start learning.")
    router.push('/learn')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 text-center">
        <div className="text-4xl mb-3">🌍</div>
        <h1 className="text-2xl font-bold">Welcome to Fluent</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {['What&apos;s your native language?', 'What do you want to learn?', 'What&apos;s your reason?', 'How much time per day?'][step]}
        </p>
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`h-2 w-10 rounded-full transition-all duration-300 ${
                i < step ? 'bg-primary' : i === step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Animated step content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto px-4 pb-4"
          >
            {/* Step 0 — Native language */}
            {step === 0 && (
              <div className="space-y-2">
                {NATIVE_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setNativeLanguage(lang.code)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      nativeLanguage === lang.code
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-semibold flex-1 text-left">{lang.name}</span>
                    {nativeLanguage === lang.code && (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 1 — Learning language */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {LEARNING_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLearningLanguage(lang.code)}
                    disabled={lang.code === nativeLanguage}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      learningLanguage === lang.code
                        ? 'border-primary bg-primary/5'
                        : lang.code === nativeLanguage
                        ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/20 opacity-40'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-3xl">{lang.flag}</span>
                    <p className="font-bold text-sm">{lang.name}</p>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">{lang.description}</p>
                    {learningLanguage === lang.code && (
                      <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Motivation */}
            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {MOTIVATIONS.map(m => (
                  <button
                    key={m.code}
                    onClick={() => setMotivation(m.code)}
                    className={`flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all ${
                      motivation === m.code
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-3xl">{m.icon}</span>
                    <div className="text-center">
                      <p className="font-bold text-sm">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.description}</p>
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

            {/* Step 3 — Daily goal */}
            {step === 3 && (
              <div className="space-y-3 max-w-sm mx-auto">
                {DAILY_GOALS.map(g => (
                  <button
                    key={g.minutes}
                    onClick={() => setDailyGoal(g.minutes)}
                    className={`relative w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                      dailyGoal === g.minutes
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    {g.recommended && (
                      <span className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="text-left">
                      <p className="font-bold">{g.label}</p>
                      <p className="text-sm text-muted-foreground">{g.description}</p>
                    </div>
                    {dailyGoal === g.minutes && (
                      <div className="ml-auto size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-primary/10 space-y-2">
        {step === 3 ? (
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {saving ? 'Setting up...' : "Let's Start Learning 🚀"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight size={18} />
          </button>
        )}

        {step > 0 && (
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
