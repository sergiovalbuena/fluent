'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLanguage } from '@/lib/languages'
import { SELF_LEVELS, estimateLevel, placementWords, type Cefr, type SelfLevel } from '@/lib/placement'
import { getAuthUser } from '@/lib/supabase/auth'

// ── Data ──────────────────────────────────────────────────────────────────────

// Languages the app can be used in (UI + translations); names come from Intl
const NATIVE_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'zh']

/** Locales with app UI messages (messages/<code>.json) */
const UI_LOCALES = ['en', 'es', 'fr', 'pt', 'de', 'it', 'ja']
/** Languages lesson content can be translated into (same list as the profile setting) */
const TRANSLATION_LANGUAGES = ['es', 'en', 'pt', 'fr', 'de', 'it']

const LEARNING_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'it', 'ja']

const MOTIVATIONS = [
  { code: 'travel',  icon: '✈️', highlight: true },
  { code: 'work',    icon: '💼', highlight: false },
  { code: 'family',  icon: '❤️', highlight: false },
  { code: 'culture', icon: '🎭', highlight: false },
  { code: 'brain',   icon: '🧠', highlight: false },
  { code: 'curious', icon: '🌍', highlight: false },
]

// ISO 3166 region codes; names are localized with Intl.DisplayNames
const DESTINATIONS: Record<string, string[]> = {
  en: ['US', 'GB', 'CA', 'AU', 'IE', 'NZ'],
  es: ['MX', 'ES', 'CO', 'AR', 'PE', 'CU', 'CR', 'CL'],
  fr: ['FR', 'CA', 'BE', 'CH', 'MA', 'SN'],
  de: ['DE', 'AT', 'CH', 'LU'],
  pt: ['BR', 'PT', 'CV', 'MZ'],
  it: ['IT', 'VA', 'SM', 'CH'],
  ja: ['JP'],
}

function flagEmoji(region: string): string {
  return String.fromCodePoint(...[...region].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const DAILY_GOALS = [
  { minutes: 5,  key: 'goal_casual',    emoji: '🌱' },
  { minutes: 10, key: 'goal_regular',   emoji: '🔥', recommended: true },
  { minutes: 20, key: 'goal_intensive', emoji: '⚡' },
] as const

// ── Step config ───────────────────────────────────────────────────────────────

type StepKey = 'native' | 'learn' | 'motivation' | 'destination' | 'level' | 'words' | 'result' | 'goal'

/** Destination only for travellers; the word check and its result only when not starting from scratch */
function stepsFor(travel: boolean, placement: boolean): StepKey[] {
  return [
    'native', 'learn', 'motivation',
    ...(travel ? ['destination' as const] : []),
    'level',
    ...(placement ? ['words' as const, 'result' as const] : []),
    'goal',
  ]
}

const STEP_EMOJI: Record<StepKey, string> = {
  native: '🌏', learn: '📚', motivation: '⚡', destination: '✈️', level: '📊', words: '🔤', result: '🏅', goal: '🎯',
}

// ── Animations ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const locale = useLocale()

  const [stepIdx, setStepIdx]               = useState(0)
  const [direction, setDirection]           = useState(1)
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [motivation, setMotivation]         = useState('')
  const [destination, setDestination]       = useState('')
  const [selfLevel, setSelfLevel]           = useState<SelfLevel | ''>('')
  const [knownWords, setKnownWords]         = useState<Set<string>>(new Set())
  const [dailyGoal, setDailyGoal]           = useState(10)
  const [saving, setSaving]                 = useState(false)

  const isTravel = motivation === 'travel'
  const band = SELF_LEVELS.find(l => l.code === selfLevel)?.band ?? null
  const steps = stepsFor(isTravel, band !== null)
  const currentKey = steps[stepIdx]

  // Placement: words of the chosen band, in the language being learned
  const words = useMemo(() => (band ? placementWords(learningLanguage, band) : []), [band, learningLanguage])
  const realTotal  = words.filter(w => !w.fake).length
  const realKnown  = words.filter(w => !w.fake && knownWords.has(w.word)).length
  const fakesKnown = words.filter(w => w.fake && knownWords.has(w.word)).length
  const estimatedLevel: Cefr | null =
    selfLevel === 'zero' ? 'A0' : band ? estimateLevel(band, realKnown, realTotal, fakesKnown) : null

  // Language and country names in the current UI language
  const names = useMemo(() => ({
    language: new Intl.DisplayNames([locale], { type: 'language' }),
    region:   new Intl.DisplayNames([locale], { type: 'region' }),
  }), [locale])
  const languageName = (code: string) => {
    const name = names.language.of(code) ?? getLanguage(code).name
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
  }

  // The native language sets the app language and the translation language,
  // so the rest of the onboarding is already shown in it
  async function applyNativeLanguage() {
    const supabase = createClient()
    const { data: { user } } = await getAuthUser(supabase)
    if (!user) return
    await supabase.from('user_profiles').update({
      app_language_code: UI_LOCALES.includes(nativeLanguage) ? nativeLanguage : 'en',
      translation_language_code: TRANSLATION_LANGUAGES.includes(nativeLanguage) ? nativeLanguage : 'en',
    }).eq('user_id', user.id)
    router.refresh()
  }

  function goNext() {
    if (currentKey === 'native') void applyNativeLanguage()
    setDirection(1)
    setStepIdx(s => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStepIdx(s => s - 1)
  }

  // When motivation changes, reset travel-specific fields
  function selectMotivation(code: string) {
    setMotivation(code)
    setDestination('')
  }

  // The word list depends on the course and the level, so a new choice starts it over
  function selectLearningLanguage(code: string) {
    if (code !== learningLanguage) setKnownWords(new Set())
    setLearningLanguage(code)
  }

  function selectSelfLevel(code: SelfLevel) {
    if (code !== selfLevel) setKnownWords(new Set())
    setSelfLevel(code)
  }

  function toggleWord(word: string) {
    setKnownWords(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  const canContinue: boolean = (() => {
    switch (currentKey) {
      case 'native':      return !!nativeLanguage
      case 'learn':       return !!learningLanguage
      case 'motivation':  return !!motivation
      case 'destination': return !!destination.trim()
      case 'level':       return !!selfLevel
      case 'words':       return true
      case 'result':      return true
      case 'goal':        return true
    }
  })()

  async function handleComplete() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await getAuthUser(supabase)
    if (!user) { router.push('/login'); return }

    // Only the onboarding answers: XP, streak and name are left as they are
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      native_language_code: nativeLanguage,
      app_language_code: UI_LOCALES.includes(nativeLanguage) ? nativeLanguage : 'en',
      translation_language_code: TRANSLATION_LANGUAGES.includes(nativeLanguage) ? nativeLanguage : 'en',
      motivation,
      daily_goal_minutes: dailyGoal,
      travel_destination: isTravel ? destination.trim() : null,
    }, { onConflict: 'user_id' })

    if (profileError) { toast.error(t('save_error')); setSaving(false); return }

    await supabase.from('user_languages').update({ is_active: false }).eq('user_id', user.id)

    const { error: langError } = await supabase.from('user_languages').upsert({
      user_id: user.id,
      language_code: learningLanguage,
      is_active: true,
      is_unlocked: true,
      level: estimatedLevel,
    }, { onConflict: 'user_id,language_code' })

    if (langError) { toast.error(t('save_error')); setSaving(false); return }

    toast.success(t('done'))
    router.push('/learn')
    router.refresh()
  }

  const isLast = stepIdx === steps.length - 1
  const destinations = DESTINATIONS[learningLanguage] ?? []
  const destinationNames = destinations.map(code => names.region.of(code) ?? code)

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#1b2030]">

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
                currentKey === 'result'
                  ? 'bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/30'
                  : 'bg-primary/10'
              )}
            >
              {STEP_EMOJI[currentKey]}
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
            <h1 className="text-2xl font-bold leading-tight">{t(`${currentKey}_title`)}</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
              {currentKey === 'words' && band ? t(`words_subtitle_${band}`) : t(`${currentKey}_subtitle`)}
            </p>
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
                {NATIVE_LANGUAGES.map(code => {
                  const lang = getLanguage(code)
                  return (
                    <button
                      key={code}
                      onClick={() => setNativeLanguage(code)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
                        nativeLanguage === code
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                      )}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="flex-1 text-left">
                        <span className="font-semibold text-sm block">{lang.nativeName}</span>
                        {languageName(code) !== lang.nativeName && (
                          <span className="text-[11px] text-muted-foreground">{languageName(code)}</span>
                        )}
                      </span>
                      {nativeLanguage === code && (
                        <div className="size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check size={13} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* STEP: Learning language */}
            {currentKey === 'learn' && (
              <div className="grid grid-cols-2 gap-3">
                {LEARNING_LANGUAGES.map(code => (
                  <button
                    key={code}
                    onClick={() => selectLearningLanguage(code)}
                    disabled={code === nativeLanguage}
                    className={cn(
                      'flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all',
                      learningLanguage === code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : code === nativeLanguage
                        ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/20 opacity-30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    <span className="text-3xl">{getLanguage(code).flag}</span>
                    <p className="font-bold text-sm">{languageName(code)}</p>
                    <p className="text-[11px] text-muted-foreground text-center leading-tight">{t(`lang_${code}`)}</p>
                    {learningLanguage === code && (
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
                        {t('popular')}
                      </span>
                    )}
                    <span className="text-3xl">{m.icon}</span>
                    <div className="text-center">
                      <p className="font-bold text-sm">{t(`mot_${m.code}`)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t(`mot_${m.code}_desc`)}</p>
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
                  {destinations.map((code, i) => (
                    <button
                      key={code}
                      onClick={() => setDestination(destinationNames[i])}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                        destination === destinationNames[i]
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                      )}
                    >
                      <span className="text-2xl">{flagEmoji(code)}</span>
                      <span className="font-semibold text-sm flex-1 text-left">{destinationNames[i]}</span>
                      {destination === destinationNames[i] && (
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
                    placeholder={t('other_destination')}
                    value={destinationNames.includes(destination) ? '' : destination}
                    onChange={e => setDestination(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {/* STEP: Current level */}
            {currentKey === 'level' && (
              <div className="space-y-3 max-w-sm mx-auto">
                {SELF_LEVELS.map(l => (
                  <button
                    key={l.code}
                    onClick={() => selectSelfLevel(l.code)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                      selfLevel === l.code
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/30'
                    )}
                  >
                    <span className="text-2xl">{l.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">
                        {t(`level_${l.code}`)}
                        {l.band && <span className="ml-2 text-[11px] font-semibold text-muted-foreground">{l.band}1-{l.band}2</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(`level_${l.code}_desc`)}</p>
                    </div>
                    {selfLevel === l.code && (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Words you know (placement check) */}
            {currentKey === 'words' && (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/10 rounded-2xl p-3.5">
                  <span className="text-lg shrink-0">👆</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('words_hint')}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2" lang={learningLanguage}>
                  {words.map(({ word }) => {
                    const known = knownWords.has(word)
                    return (
                      <button
                        key={word}
                        onClick={() => toggleWord(word)}
                        aria-pressed={known}
                        className={cn(
                          'px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all active:scale-95',
                          known
                            ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20'
                            : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-primary/30'
                        )}
                      >
                        {word}
                      </button>
                    )
                  })}
                </div>
                <p className="text-center text-xs font-semibold text-muted-foreground tabular-nums">
                  {t('words_selected', { n: knownWords.size, total: words.length })}
                </p>
              </div>
            )}

            {/* STEP: Estimated level */}
            {currentKey === 'result' && estimatedLevel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="max-w-sm mx-auto flex flex-col items-center gap-4 text-center pt-2"
              >
                <div className="size-28 rounded-3xl bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/30 flex items-center justify-center">
                  <span className="text-4xl font-black text-white tracking-tight">{estimatedLevel}</span>
                </div>
                <div>
                  <p className="text-xl font-bold">{t(`cefr_${estimatedLevel}`)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('result_known', { known: realKnown, total: realTotal })}
                  </p>
                  {fakesKnown > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t('result_fakes', { n: fakesKnown })}</p>
                  )}
                </div>
                <div className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-2xl p-4 text-left">
                  <span className="text-lg mt-0.5">💡</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('result_note')}</p>
                </div>
              </motion.div>
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
                    {'recommended' in g && g.recommended && (
                      <span className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {t('recommended')}
                      </span>
                    )}
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">{t(g.key)}</p>
                      <p className="text-xs text-muted-foreground">{t('goal_minutes', { minutes: g.minutes })}</p>
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
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('goal_tip')}</p>
                </div>
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
            {saving ? t('saving') : t('start')}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 rounded-2xl h-13 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('continue')}
            <ChevronRight size={18} />
          </button>
        )}

        {stepIdx > 0 && (
          <button
            onClick={goBack}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground py-2"
          >
            <ArrowLeft size={14} />
            {t('back')}
          </button>
        )}
      </div>

    </div>
  )
}
