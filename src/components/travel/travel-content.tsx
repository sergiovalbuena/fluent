'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check, ArrowRight, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Phrases data ──────────────────────────────────────────────────────────────

type Phrase = {
  emoji: string
  category: string
  phrase: string
  phonetic: string
  translation: string
}

const PHRASES: Record<string, Phrase[]> = {
  es: [
    // Survival
    { emoji: '🚽', category: 'Survival',    phrase: '¿Dónde está el baño?',          phonetic: 'don-de es-ta el ba-nyo',            translation: 'Where is the bathroom?' },
    { emoji: '🆘', category: 'Survival',    phrase: '¿Me puede ayudar?',              phonetic: 'me pwe-de a-yu-dar',                translation: 'Can you help me?' },
    { emoji: '🙏', category: 'Survival',    phrase: 'No hablo español bien.',         phonetic: 'no ab-lo es-pan-yol byen',          translation: "I don't speak Spanish well." },
    { emoji: '🔄', category: 'Survival',    phrase: '¿Puede repetir, por favor?',     phonetic: 'pwe-de re-pe-tir por fa-bor',       translation: 'Can you repeat that, please?' },
    { emoji: '📍', category: 'Survival',    phrase: 'Estoy perdido/a.',               phonetic: 'es-toy per-dee-do/da',              translation: "I'm lost." },
    // Money
    { emoji: '💰', category: 'Money',       phrase: '¿Cuánto cuesta esto?',           phonetic: 'kwan-to kwes-ta es-to',             translation: 'How much is this?' },
    { emoji: '🍽️', category: 'Money',       phrase: 'La cuenta, por favor.',          phonetic: 'la kwen-ta por fa-bor',             translation: 'The bill, please.' },
    { emoji: '💳', category: 'Money',       phrase: '¿Aceptan tarjeta?',              phonetic: 'a-sep-tan tar-he-ta',               translation: 'Do you accept cards?' },
    { emoji: '🏧', category: 'Money',       phrase: '¿Dónde hay un cajero?',          phonetic: 'don-de ay un ka-he-ro',             translation: 'Where is an ATM?' },
    // Transport
    { emoji: '🚕', category: 'Transport',   phrase: 'Lléveme a esta dirección.',      phonetic: 'ye-be-me a es-ta di-rek-syon',      translation: 'Take me to this address.' },
    { emoji: '🚌', category: 'Transport',   phrase: '¿Dónde está la parada?',         phonetic: 'don-de es-ta la pa-ra-da',          translation: 'Where is the bus stop?' },
    { emoji: '✈️', category: 'Transport',   phrase: '¿A qué hora sale el vuelo?',     phonetic: 'a ke o-ra sa-le el bwe-lo',         translation: 'What time does the flight leave?' },
    // Food
    { emoji: '🌮', category: 'Food',        phrase: 'Una mesa para dos, por favor.',  phonetic: 'u-na me-sa pa-ra dos por fa-bor',   translation: 'A table for two, please.' },
    { emoji: '🥗', category: 'Food',        phrase: 'Soy alérgico/a a...',            phonetic: 'soy a-ler-hi-ko/ka a',              translation: "I'm allergic to..." },
    { emoji: '😋', category: 'Food',        phrase: '¡Está delicioso!',               phonetic: 'es-ta de-li-syo-so',                translation: 'This is delicious!' },
    // Social
    { emoji: '👋', category: 'Social',      phrase: '¡Mucho gusto!',                  phonetic: 'mu-cho gus-to',                     translation: 'Nice to meet you!' },
    { emoji: '🎉', category: 'Social',      phrase: '¡Salud!',                        phonetic: 'sa-lud',                            translation: 'Cheers!' },
    { emoji: '📸', category: 'Social',      phrase: '¿Me puede tomar una foto?',      phonetic: 'me pwe-de to-mar u-na fo-to',       translation: 'Can you take my photo?' },
  ],
  fr: [
    { emoji: '🚽', category: 'Survival',    phrase: 'Où sont les toilettes ?',        phonetic: 'oo son lay twa-let',                translation: 'Where is the bathroom?' },
    { emoji: '🆘', category: 'Survival',    phrase: "Pouvez-vous m'aider ?",          phonetic: 'poo-vay voo may-day',               translation: 'Can you help me?' },
    { emoji: '🙏', category: 'Survival',    phrase: 'Je ne parle pas bien français.', phonetic: 'zhuh nuh parl pa byan fran-say',    translation: "I don't speak French well." },
    { emoji: '🔄', category: 'Survival',    phrase: 'Pouvez-vous répéter ?',          phonetic: 'poo-vay voo ray-pay-tay',           translation: 'Can you repeat that?' },
    { emoji: '📍', category: 'Survival',    phrase: 'Je suis perdu(e).',              phonetic: 'zhuh swee per-doo',                 translation: "I'm lost." },
    { emoji: '💰', category: 'Money',       phrase: 'Combien ça coûte ?',             phonetic: 'kom-byan sa koot',                  translation: 'How much is this?' },
    { emoji: '🍽️', category: 'Money',       phrase: "L'addition, s'il vous plaît.",  phonetic: 'la-dee-syon seel voo play',         translation: 'The bill, please.' },
    { emoji: '💳', category: 'Money',       phrase: 'Acceptez-vous les cartes ?',     phonetic: 'ak-sep-tay voo lay kart',           translation: 'Do you accept cards?' },
    { emoji: '🚕', category: 'Transport',   phrase: 'Conduisez-moi à cette adresse.', phonetic: 'kon-dwee-zay mwa a set a-dress',   translation: 'Take me to this address.' },
    { emoji: '🌮', category: 'Food',        phrase: 'Une table pour deux, s\'il vous plaît.', phonetic: 'oon tabl poor duh seel voo play', translation: 'A table for two, please.' },
    { emoji: '😋', category: 'Food',        phrase: "C'est délicieux !",              phonetic: 'say day-lee-syuh',                  translation: 'This is delicious!' },
    { emoji: '👋', category: 'Social',      phrase: 'Enchanté(e) !',                  phonetic: 'on-shan-tay',                       translation: 'Nice to meet you!' },
    { emoji: '🎉', category: 'Social',      phrase: 'Santé !',                        phonetic: 'san-tay',                           translation: 'Cheers!' },
  ],
  pt: [
    { emoji: '🚽', category: 'Survival',    phrase: 'Onde fica o banheiro?',          phonetic: 'on-de fee-ka o ban-yey-ro',         translation: 'Where is the bathroom?' },
    { emoji: '🆘', category: 'Survival',    phrase: 'Pode me ajudar?',                phonetic: 'po-de me a-zhoo-dar',               translation: 'Can you help me?' },
    { emoji: '🙏', category: 'Survival',    phrase: 'Não falo português bem.',        phonetic: 'now fa-lo por-too-gez ben',         translation: "I don't speak Portuguese well." },
    { emoji: '💰', category: 'Money',       phrase: 'Quanto custa isso?',             phonetic: 'kwan-to koos-ta ee-so',             translation: 'How much is this?' },
    { emoji: '🍽️', category: 'Money',       phrase: 'A conta, por favor.',            phonetic: 'a kon-ta por fa-vor',               translation: 'The bill, please.' },
    { emoji: '🚕', category: 'Transport',   phrase: 'Me leve para este endereço.',    phonetic: 'me le-ve pa-ra es-te en-de-re-so',  translation: 'Take me to this address.' },
    { emoji: '🌮', category: 'Food',        phrase: 'Uma mesa para dois, por favor.', phonetic: 'u-ma me-za pa-ra doys por fa-vor', translation: 'A table for two, please.' },
    { emoji: '👋', category: 'Social',      phrase: 'Muito prazer!',                  phonetic: 'mwee-to pra-zer',                   translation: 'Nice to meet you!' },
    { emoji: '🎉', category: 'Social',      phrase: 'Saúde!',                         phonetic: 'sa-oo-de',                          translation: 'Cheers!' },
  ],
  de: [
    { emoji: '🚽', category: 'Survival',    phrase: 'Wo ist die Toilette?',           phonetic: 'vo ist dee toy-le-te',              translation: 'Where is the bathroom?' },
    { emoji: '🆘', category: 'Survival',    phrase: 'Können Sie mir helfen?',         phonetic: 'kö-nen zee meer hel-fen',           translation: 'Can you help me?' },
    { emoji: '🙏', category: 'Survival',    phrase: 'Ich spreche nicht gut Deutsch.', phonetic: 'ikh shpre-khe nikht goot doytsh',   translation: "I don't speak German well." },
    { emoji: '💰', category: 'Money',       phrase: 'Wie viel kostet das?',           phonetic: 'vee feel kos-tet das',              translation: 'How much is this?' },
    { emoji: '🍽️', category: 'Money',       phrase: 'Die Rechnung, bitte.',           phonetic: 'dee rekh-noong bi-te',              translation: 'The bill, please.' },
    { emoji: '🚕', category: 'Transport',   phrase: 'Bringen Sie mich zu dieser Adresse.', phonetic: 'brin-gen zee mikh tsoo dee-zer a-dre-se', translation: 'Take me to this address.' },
    { emoji: '👋', category: 'Social',      phrase: 'Schön, Sie kennenzulernen!',     phonetic: 'shön zee ke-nen-tsoo-ler-nen',     translation: 'Nice to meet you!' },
    { emoji: '🎉', category: 'Social',      phrase: 'Prost!',                         phonetic: 'prost',                             translation: 'Cheers!' },
  ],
  it: [
    { emoji: '🚽', category: 'Survival',    phrase: "Dov'è il bagno?",               phonetic: 'do-ve il ban-yo',                   translation: 'Where is the bathroom?' },
    { emoji: '🆘', category: 'Survival',    phrase: 'Può aiutarmi?',                 phonetic: 'pwo a-yoo-tar-mi',                  translation: 'Can you help me?' },
    { emoji: '🙏', category: 'Survival',    phrase: "Non parlo bene l'italiano.",    phonetic: 'non par-lo be-ne lee-ta-lya-no',    translation: "I don't speak Italian well." },
    { emoji: '💰', category: 'Money',       phrase: 'Quanto costa questo?',          phonetic: 'kwan-to kos-ta kwes-to',            translation: 'How much is this?' },
    { emoji: '🍽️', category: 'Money',       phrase: 'Il conto, per favore.',         phonetic: 'il kon-to per fa-vo-re',            translation: 'The bill, please.' },
    { emoji: '🌮', category: 'Food',        phrase: 'Un tavolo per due, per favore.', phonetic: 'un ta-vo-lo per due per fa-vo-re', translation: 'A table for two, please.' },
    { emoji: '😋', category: 'Food',        phrase: 'È delizioso!',                  phonetic: 'e de-li-tsyo-zo',                   translation: 'This is delicious!' },
    { emoji: '👋', category: 'Social',      phrase: 'Piacere!',                      phonetic: 'pya-che-re',                        translation: 'Nice to meet you!' },
    { emoji: '🎉', category: 'Social',      phrase: 'Salute!',                       phonetic: 'sa-loo-te',                         translation: 'Cheers!' },
  ],
  ja: [
    { emoji: '🚽', category: 'Survival',    phrase: 'トイレはどこですか？',            phonetic: 'to-i-re wa do-ko des-ka',           translation: 'Where is the bathroom?' },
    { emoji: '🆘', category: 'Survival',    phrase: '助けてください。',                phonetic: 'ta-su-ke-te ku-da-sa-i',            translation: 'Please help me.' },
    { emoji: '🙏', category: 'Survival',    phrase: '日本語があまり話せません。',       phonetic: 'ni-hon-go ga a-ma-ri ha-na-se-ma-sen', translation: "I don't speak Japanese well." },
    { emoji: '💰', category: 'Money',       phrase: 'これはいくらですか？',            phonetic: 'ko-re wa i-ku-ra des-ka',           translation: 'How much is this?' },
    { emoji: '🍽️', category: 'Money',       phrase: 'お会計をお願いします。',          phonetic: 'o-kai-kei o o-ne-gai-shi-mas',     translation: 'The bill, please.' },
    { emoji: '🌮', category: 'Food',        phrase: '二人席をお願いします。',           phonetic: 'fu-ta-ri se-ki o o-ne-gai-shi-mas', translation: 'A table for two, please.' },
    { emoji: '👋', category: 'Social',      phrase: 'はじめまして！',                  phonetic: 'ha-ji-me-ma-shi-te',                translation: 'Nice to meet you!' },
    { emoji: '🎉', category: 'Social',      phrase: '乾杯！',                         phonetic: 'kan-pai',                           translation: 'Cheers!' },
  ],
}

const CATEGORIES = ['Survival', 'Money', 'Transport', 'Food', 'Social']

const CATEGORY_COLORS: Record<string, string> = {
  Survival:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/30',
  Money:     'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30',
  Transport: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',
  Food:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30',
  Social:    'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-800/30',
}

const LANG_NAMES: Record<string, { name: string; flag: string }> = {
  es: { name: 'Spanish',    flag: '🇪🇸' },
  fr: { name: 'French',     flag: '🇫🇷' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  de: { name: 'German',     flag: '🇩🇪' },
  it: { name: 'Italian',    flag: '🇮🇹' },
  ja: { name: 'Japanese',   flag: '🇯🇵' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TravelContent({ languageCode, destination }: { languageCode: string; destination: string | null }) {
  const [learned, setLearned] = useState<Set<number>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>('Survival')

  const phrases = PHRASES[languageCode] ?? PHRASES['es']
  const lang = LANG_NAMES[languageCode] ?? { name: languageCode.toUpperCase(), flag: '🌐' }
  const filtered = phrases.filter(p => p.category === activeCategory)
  const availableCategories = CATEGORIES.filter(c => phrases.some(p => p.category === c))

  const totalLearned = learned.size
  const totalPhrases = phrases.length

  function toggleLearned(globalIdx: number) {
    setLearned(prev => {
      const next = new Set(prev)
      next.has(globalIdx) ? next.delete(globalIdx) : next.add(globalIdx)
      return next
    })
  }

  // Map filtered phrase to its global index in phrases array
  function globalIndex(phrase: Phrase): number {
    return phrases.indexOf(phrase)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="Travel Mode" back={{ href: '/dashboard' }} />

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl overflow-hidden mb-5 relative"
          style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)' }}
        >
          <div className="absolute -bottom-4 -right-4 text-[6rem] leading-none opacity-[0.12] select-none pointer-events-none">🌍</div>
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                  {destination ? `Headed to ${destination}` : 'Travel Survival Kit'}
                </p>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {lang.flag} {lang.name}
                </h2>
                <p className="text-sm text-white/60 mt-1">
                  {totalPhrases} phrases across {availableCategories.length} situations
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-1 bg-white/15 rounded-2xl px-3 py-2.5">
                <p className="text-2xl font-bold text-white tabular-nums leading-none">{totalLearned}</p>
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">learned</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                animate={{ width: `${totalPhrases > 0 ? (totalLearned / totalPhrases) * 100 : 0}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                activeCategory === cat
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                  : 'bg-white dark:bg-white/[0.06] border-black/[0.07] dark:border-white/[0.07] text-slate-500 dark:text-slate-400 hover:border-primary/30'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Phrases */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-2.5"
        >
          {filtered.map((phrase) => {
            const idx = globalIndex(phrase)
            const isLearned = learned.has(idx)
            return (
              <motion.button
                key={idx}
                onClick={() => toggleLearned(idx)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full rounded-2xl border-2 p-4 text-left transition-all duration-200',
                  isLearned
                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-white/[0.04] hover:border-primary/30'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none shrink-0 mt-0.5">{phrase.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{phrase.phrase}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tracking-wide">{phrase.phonetic}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">{phrase.translation}</p>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', CATEGORY_COLORS[phrase.category])}>
                        {phrase.category}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {isLearned ? (
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
              </motion.button>
            )
          })}
        </motion.div>

        {/* CTA */}
        <div className="mt-6">
          <Link href="/learn">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 bg-primary px-5 py-4 rounded-2xl shadow-[0_4px_0_#c4612e] cursor-pointer"
            >
              <div className="flex-1">
                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none mb-0.5">
                  Ready for more?
                </p>
                <p className="text-sm font-bold text-white">Continue the Learning Path</p>
              </div>
              <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <ArrowRight size={15} className="text-white" />
              </div>
            </motion.div>
          </Link>
        </div>

      </main>
    </div>
  )
}
