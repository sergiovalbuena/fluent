'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLanguage, speak } from '@/lib/languages'

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

type PhraseKey = 'bathroom' | 'price' | 'dont_speak' | 'help' | 'bill'

type SurvivalPhrase = {
  key: PhraseKey
  emoji: string
  phrase: string
  phonetic: string
}

const PHRASE_EMOJI: Record<PhraseKey, string> = {
  bathroom: '🚽', price: '💰', dont_speak: '🙏', help: '🆘', bill: '🍽️',
}

// [key, phrase, phonetic] — the meaning comes from the UI messages (onboarding.phrase_*)
const SURVIVAL_PHRASES: Record<string, Array<[PhraseKey, string, string]>> = {
  // Phonetics spelled for Spanish speakers, the main audience of the English course
  en: [
    ['bathroom',   'Where is the bathroom?',           'güer is de bázrum'],
    ['price',      'How much is this?',                'jáu mach is dis'],
    ['dont_speak', "I don't speak English well.",      'ái dont spik ínglish güel'],
    ['help',       'Can you help me?',                 'can iú jelp mi'],
    ['bill',       'The check, please.',               'de chek, plis'],
  ],
  es: [
    ['bathroom',   '¿Dónde está el baño?',            'don-de es-ta el ba-nyo'],
    ['price',      '¿Cuánto cuesta esto?',             'kwan-to kwes-ta es-to'],
    ['dont_speak', 'No hablo bien español.',           'no ab-lo byen es-pan-yol'],
    ['help',       '¿Me puede ayudar?',                'me pwe-de a-yu-dar'],
    ['bill',       'La cuenta, por favor.',            'la kwen-ta por fa-bor'],
  ],
  fr: [
    ['bathroom',   'Où sont les toilettes ?',          'oo son lay twa-let'],
    ['price',      'Combien ça coûte ?',               'kom-byan sa koot'],
    ['dont_speak', 'Je ne parle pas bien français.',   'zhuh nuh parl pa byan fran-say'],
    ['help',       "Pouvez-vous m'aider ?",            'poo-vay voo may-day'],
    ['bill',       "L'addition, s'il vous plaît.",     'la-dee-syon seel voo play'],
  ],
  de: [
    ['bathroom',   'Wo ist die Toilette?',             'vo ist dee toy-le-te'],
    ['price',      'Wie viel kostet das?',             'vee feel kos-tet das'],
    ['dont_speak', 'Ich spreche nicht gut Deutsch.',   'ikh shpre-khe nikht goot doytsh'],
    ['help',       'Können Sie mir helfen?',           'kö-nen zee meer hel-fen'],
    ['bill',       'Die Rechnung, bitte.',             'dee rekh-noong bi-te'],
  ],
  pt: [
    ['bathroom',   'Onde fica o banheiro?',            'on-de fee-ka o ban-yey-ro'],
    ['price',      'Quanto custa isso?',               'kwan-to koos-ta ee-so'],
    ['dont_speak', 'Não falo português bem.',          'now fa-lo por-too-gez ben'],
    ['help',       'Pode me ajudar?',                  'po-de me a-zhoo-dar'],
    ['bill',       'A conta, por favor.',              'a kon-ta por fa-vor'],
  ],
  it: [
    ['bathroom',   "Dov'è il bagno?",                  'do-ve il ban-yo'],
    ['price',      'Quanto costa questo?',             'kwan-to kos-ta kwes-to'],
    ['dont_speak', "Non parlo bene l'italiano.",       'non par-lo be-ne lee-ta-lya-no'],
    ['help',       'Può aiutarmi?',                    'pwo a-yoo-tar-mi'],
    ['bill',       'Il conto, per favore.',            'il kon-to per fa-vo-re'],
  ],
  ja: [
    ['bathroom',   'トイレはどこですか？',              'to-i-re wa do-ko des-ka'],
    ['price',      'これはいくらですか？',              'ko-re wa i-ku-ra des-ka'],
    ['dont_speak', '日本語があまり話せません。',         'ni-hon-go ga a-ma-ri ha-na-se-ma-sen'],
    ['help',       '手伝ってもらえますか？',             'te-tsu-dat-te mo-ra-e-mas-ka'],
    ['bill',       'お会計をお願いします。',             'o-kai-kei o o-ne-gai-shi-mas'],
  ],
}

const DAILY_GOALS = [
  { minutes: 5,  key: 'goal_casual',    emoji: '🌱' },
  { minutes: 10, key: 'goal_regular',   emoji: '🔥', recommended: true },
  { minutes: 20, key: 'goal_intensive', emoji: '⚡' },
] as const

// ── Step config ───────────────────────────────────────────────────────────────

type StepKey = 'native' | 'learn' | 'motivation' | 'destination' | 'kit' | 'goal'

const ALL_STEPS: StepKey[] = ['native', 'learn', 'motivation', 'destination', 'kit', 'goal']
const NON_TRAVEL_STEPS: StepKey[] = ['native', 'learn', 'motivation', 'kit', 'goal']

const STEP_EMOJI: Record<StepKey, string> = {
  native: '🌏', learn: '📚', motivation: '⚡', destination: '✈️', kit: '🆘', goal: '🎯',
}

// ── Animations ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

// ── Survival Kit Card ─────────────────────────────────────────────────────────

function PhraseCard({ phrase, translation, index, revealed, onReveal }: {
  phrase: SurvivalPhrase
  translation: string
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{translation}</p>
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
  const t = useTranslations('onboarding')
  const locale = useLocale()

  const [stepIdx, setStepIdx]               = useState(0)
  const [direction, setDirection]           = useState(1)
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [motivation, setMotivation]         = useState('')
  const [destination, setDestination]       = useState('')
  const [revealedPhrases, setRevealedPhrases] = useState<Set<number>>(new Set())
  const [dailyGoal, setDailyGoal]           = useState(10)
  const [saving, setSaving]                 = useState(false)

  const isTravel = motivation === 'travel'
  const steps: StepKey[] = isTravel ? ALL_STEPS : NON_TRAVEL_STEPS
  const currentKey = steps[stepIdx]

  // Language and country names in the current UI language
  const names = useMemo(() => ({
    language: new Intl.DisplayNames([locale], { type: 'language' }),
    region:   new Intl.DisplayNames([locale], { type: 'region' }),
  }), [locale])
  const languageName = (code: string) => {
    const name = names.language.of(code) ?? getLanguage(code).name
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
  }

  const phrases: SurvivalPhrase[] = (SURVIVAL_PHRASES[learningLanguage] ?? SURVIVAL_PHRASES.es)
    .map(([key, phrase, phonetic]) => ({ key, emoji: PHRASE_EMOJI[key], phrase, phonetic }))
  const phraseTranslation = (key: PhraseKey) => key === 'dont_speak'
    // Inside a sentence, keep the language name as Intl returns it (lowercase in es/fr/it/pt)
    ? t('phrase_dont_speak', { language: names.language.of(learningLanguage || 'es') ?? '' })
    : t(`phrase_${key}`)

  // The native language sets the app language and the translation language,
  // so the rest of the onboarding is already shown in it
  async function applyNativeLanguage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
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

  const canContinue: boolean = (() => {
    switch (currentKey) {
      case 'native':      return !!nativeLanguage
      case 'learn':       return !!learningLanguage
      case 'motivation':  return !!motivation
      case 'destination': return !!destination.trim()
      case 'kit':         return true
      case 'goal':        return true
    }
  })()

  function playPhrase(i: number) {
    speak(phrases[i].phrase, learningLanguage)
    setRevealedPhrases(prev => new Set([...prev, i]))
  }

  async function handleComplete() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
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
                currentKey === 'kit'
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
            <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{t(`${currentKey}_subtitle`)}</p>
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
                    onClick={() => setLearningLanguage(code)}
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

            {/* STEP: Survival Kit */}
            {currentKey === 'kit' && (
              <div className="space-y-2.5 max-w-sm mx-auto">
                {/* Context banner */}
                <div className="flex items-start gap-2.5 bg-primary/8 border border-primary/15 rounded-2xl p-3.5 mb-4">
                  <span className="text-lg shrink-0">👆</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('kit_hint')}</p>
                </div>

                {phrases.map((phrase, i) => (
                  <PhraseCard
                    key={phrase.key}
                    phrase={phrase}
                    translation={phraseTranslation(phrase.key)}
                    index={i}
                    revealed={revealedPhrases.has(i)}
                    onReveal={() => playPhrase(i)}
                  />
                ))}

                {revealedPhrases.size === phrases.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-3.5"
                  >
                    <span className="text-lg">🎉</span>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">
                      {t('kit_done')}
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
