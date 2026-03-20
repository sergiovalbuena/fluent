'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────

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

const REMINDER_TIMES = [
  { time: '7:00 AM', label: 'Early Bird', icon: '🌅' },
  { time: '8:00 AM', label: 'Morning', icon: '☀️' },
  { time: '12:00 PM', label: 'Midday', icon: '🌤️' },
  { time: '6:00 PM', label: 'After Work', icon: '🌆' },
  { time: '8:00 PM', label: 'Evening', icon: '🌙' },
  { time: '10:00 PM', label: 'Night Owl', icon: '🦉' },
]

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Language', emoji: '🌏', title: "What's your native language?", subtitle: 'We\'ll adapt the content for you' },
  { label: 'Learn', emoji: '📚', title: 'What do you want to learn?', subtitle: 'Pick the language you\'re excited about' },
  { label: 'Reason', emoji: '⚡', title: "What's driving you?", subtitle: 'Knowing your why helps us keep you motivated' },
  { label: 'Goal', emoji: '🎯', title: 'Set your daily goal', subtitle: 'Consistency beats intensity — pick what fits your life' },
  { label: 'Remind', emoji: '⏰', title: 'When should we remind you?', subtitle: 'We\'ll send a gentle nudge at your chosen time' },
]

// ── Animations ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [motivation, setMotivation] = useState('')
  const [dailyGoal, setDailyGoal] = useState(10)
  const [reminderTime, setReminderTime] = useState('8:00 AM')
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
      reminder_time: reminderTime,
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

  const currentStep = STEPS[step]

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">

      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">{currentStep.emoji}</span>
          </div>
        </div>

        {/* Step text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold leading-tight">{currentStep.title}</h1>
            <p className="text-sm text-muted-foreground mt-1.5">{currentStep.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step pill indicators */}
      <div className="flex justify-center gap-1.5 mb-6 px-6">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`h-1.5 rounded-full transition-all duration-400 ${
              i <= step
                ? 'bg-primary'
                : 'bg-slate-200 dark:bg-slate-700'
            } ${i === step ? 'w-8' : 'w-5'}`}
          />
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
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      nativeLanguage === lang.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    }`}
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

            {/* Step 1 — Learning language */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {LEARNING_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLearningLanguage(lang.code)}
                    disabled={lang.code === nativeLanguage}
                    className={`flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all ${
                      learningLanguage === lang.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : lang.code === nativeLanguage
                        ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/20 opacity-30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    }`}
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

            {/* Step 2 — Motivation */}
            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {MOTIVATIONS.map(m => (
                  <button
                    key={m.code}
                    onClick={() => setMotivation(m.code)}
                    className={`flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all ${
                      motivation === m.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    }`}
                  >
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

            {/* Step 3 — Daily goal */}
            {step === 3 && (
              <div className="space-y-3 max-w-sm mx-auto">
                {DAILY_GOALS.map(g => (
                  <button
                    key={g.minutes}
                    onClick={() => setDailyGoal(g.minutes)}
                    className={`relative w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                      dailyGoal === g.minutes
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    }`}
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

                {/* Progress tip */}
                <div className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-2xl p-4 mt-2">
                  <span className="text-lg mt-0.5">💡</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Even 5 minutes a day adds up to over 30 hours of practice per year. Consistency is the key to fluency.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4 — Reminder time */}
            {step === 4 && (
              <div className="space-y-3 max-w-sm mx-auto">
                <div className="grid grid-cols-2 gap-3">
                  {REMINDER_TIMES.map(r => (
                    <button
                      key={r.time}
                      onClick={() => setReminderTime(r.time)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        reminderTime === r.time
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                      }`}
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

                {/* Skip option */}
                <button
                  onClick={() => setReminderTime('Off')}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-sm font-medium text-muted-foreground ${
                    reminderTime === 'Off'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                  }`}
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
        {step === STEPS.length - 1 ? (
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
