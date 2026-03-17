'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronRight, Check } from 'lucide-react'

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

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleComplete() {
    if (!nativeLanguage || !learningLanguage) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Upsert user profile
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      native_language_code: nativeLanguage,
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

    // Set all existing user languages to inactive first
    await supabase
      .from('user_languages')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Upsert the chosen language
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
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      {/* Header */}
      <div className="p-6 text-center">
        <div className="text-4xl mb-2">🌍</div>
        <h1 className="text-2xl font-bold">Welcome to Fluent</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {step === 1 ? "What's your native language?" : "What do you want to learn?"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-6">
        <div className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
        <div className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {step === 1 && (
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
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
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
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-primary/10">
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!nativeLanguage}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight size={18} />
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleComplete}
              disabled={!learningLanguage || saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Setting up...' : "Let's Start Learning! 🚀"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="text-center text-sm text-muted-foreground py-2"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
