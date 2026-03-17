'use client'

import { motion, useInView } from 'framer-motion'
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { FiGlobe, FiLayers, FiCalendar, FiTrendingUp } from 'react-icons/fi'
import type { IconType } from 'react-icons'

type FeatureType = {
  id: number
  callout: string
  title: string
  description: string
  contentPosition: 'l' | 'r'
  Icon: IconType
  preview: React.ReactNode
}

// ── Visual previews for each step ──────────────────────────────────────────

const LanguagePickerPreview = () => (
  <div className="space-y-3">
    <p className="text-xs font-bold uppercase tracking-widest text-[#ff8052] mb-4">Available now</p>
    {[
      { flag: '🇪🇸', name: 'Spanish', sub: 'Most popular' },
      { flag: '🇫🇷', name: 'French', sub: '50+ modules' },
      { flag: '🇧🇷', name: 'Portuguese', sub: 'New' },
    ].map(l => (
      <div key={l.name} className="flex items-center gap-3 bg-white/10 rounded-xl p-3 border border-white/10">
        <span className="text-2xl">{l.flag}</span>
        <div className="flex-1">
          <p className="font-bold text-sm text-white">{l.name}</p>
          <p className="text-[10px] text-slate-400">{l.sub}</p>
        </div>
        <div className="size-5 rounded-full border-2 border-[#ff8052] flex items-center justify-center">
          {l.name === 'Spanish' && <div className="size-2.5 rounded-full bg-[#ff8052]" />}
        </div>
      </div>
    ))}
    <button className="w-full bg-[#ff8052] text-white font-bold py-3 rounded-xl text-sm mt-2">
      Start Learning →
    </button>
  </div>
)

const ModulesPreview = () => (
  <div className="space-y-3">
    {[
      { icon: '🗂️', label: 'Vocabulary', desc: '8 words to learn', active: true },
      { icon: '💬', label: 'Phrases', desc: '6 phrases', active: false },
      { icon: '❓', label: 'Q&A', desc: '3 questions', active: false },
      { icon: '📖', label: 'Story', desc: 'Read & write', active: false },
    ].map((tab, i) => (
      <div
        key={tab.label}
        className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
          tab.active
            ? 'bg-[#ff8052]/20 border-[#ff8052]/40'
            : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="size-9 rounded-lg bg-white/10 flex items-center justify-center text-lg">{tab.icon}</div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${tab.active ? 'text-[#ff8052]' : 'text-white'}`}>{tab.label}</p>
          <p className="text-[10px] text-slate-400">{tab.desc}</p>
        </div>
        <span className="text-[10px] font-bold text-slate-500">Step {i + 1}</span>
      </div>
    ))}
  </div>
)

const FlashcardPreview = () => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-full bg-white/10 border border-white/10 rounded-2xl p-6 text-center space-y-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest">Tap to flip</p>
      <p className="text-4xl font-bold text-white">La Madre</p>
      <div className="inline-flex items-center gap-1 bg-[#ff8052]/20 px-3 py-1 rounded-full">
        <span className="text-[10px] font-bold text-[#ff8052]">NOUN</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 w-full">
      <button className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl py-3 text-center">
        <p className="text-lg">😐</p>
        <p className="text-xs font-bold text-yellow-300">Still learning</p>
      </button>
      <button className="bg-green-500/20 border border-green-500/30 rounded-xl py-3 text-center">
        <p className="text-lg">😄</p>
        <p className="text-xs font-bold text-green-300">I knew it!</p>
      </button>
    </div>
    <div className="w-full bg-white/10 rounded-full h-2">
      <div className="bg-[#ff8052] h-2 rounded-full w-[40%]" />
    </div>
    <p className="text-[10px] text-slate-400">4 / 10 cards</p>
  </div>
)

const ProgressPreview = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Weekly Activity</p>
      <span className="text-xs bg-[#ff8052]/20 text-[#ff8052] font-bold px-2 py-0.5 rounded-full">12 day streak 🔥</span>
    </div>
    {/* Bar chart */}
    <div className="flex items-end justify-between gap-1.5 h-20">
      {[70, 40, 100, 60, 90, 20, 10].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-md"
            style={{
              height: `${h}%`,
              backgroundColor: h > 50 ? '#ff8052' : 'rgba(255,128,82,0.3)',
            }}
          />
          <span className="text-[8px] text-slate-500">
            {['M','T','W','T','F','S','S'][i]}
          </span>
        </div>
      ))}
    </div>
    {/* Stats */}
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Words', value: '245' },
        { label: 'Accuracy', value: '88%' },
        { label: 'XP', value: '1,240' },
      ].map(s => (
        <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-[#ff8052]">{s.value}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
)

// ── Feature data ───────────────────────────────────────────────────────────

const features: FeatureType[] = [
  {
    id: 1,
    callout: 'Step 1',
    title: 'Pick your language',
    description:
      'Choose from Spanish, French, Portuguese and more. Unlock your first language for free and start your journey right away — no credit card needed.',
    contentPosition: 'r',
    Icon: FiGlobe,
    preview: <LanguagePickerPreview />,
  },
  {
    id: 2,
    callout: 'Step 2',
    title: 'Follow the modules',
    description:
      'Each module covers a real topic — Family, Food, Travel. Inside each module you get 4 lesson types: Vocabulary, Phrases, Q&A, and Story, always in the right order.',
    contentPosition: 'l',
    Icon: FiLayers,
    preview: <ModulesPreview />,
  },
  {
    id: 3,
    callout: 'Step 3',
    title: 'Practice every day',
    description:
      'Spend 10 minutes a day with flashcards and quizzes. Rate each card as "I knew it" or "Still learning" so the system knows what to show you next.',
    contentPosition: 'r',
    Icon: FiCalendar,
    preview: <FlashcardPreview />,
  },
  {
    id: 4,
    callout: 'Step 4',
    title: 'Track your progress',
    description:
      'Watch your streak grow, earn XP, and see your weekly activity chart improve. Your accuracy and words learned update in real time as you complete lessons.',
    contentPosition: 'l',
    Icon: FiTrendingUp,
    preview: <ProgressPreview />,
  },
]

// ── Components ─────────────────────────────────────────────────────────────

const FeatureVisual = ({ featureInView }: { featureInView: FeatureType }) => (
  <div className="relative h-96 w-full rounded-2xl bg-slate-800 shadow-2xl overflow-hidden border border-white/10">
    {/* Mac-style top bar */}
    <div className="flex w-full gap-1.5 rounded-t-2xl bg-slate-900 px-4 py-3 items-center">
      <div className="h-3 w-3 rounded-full bg-red-500" />
      <div className="h-3 w-3 rounded-full bg-yellow-500" />
      <div className="h-3 w-3 rounded-full bg-green-500" />
      <span className="ml-3 text-[10px] text-slate-500 font-medium">fluent.app</span>
    </div>
    {/* Content */}
    <div className="p-5">
      {featureInView.preview}
    </div>
    {/* Background icon watermark */}
    <span className="absolute right-4 bottom-4 text-7xl opacity-5 pointer-events-none">
      <featureInView.Icon />
    </span>
  </div>
)

const SlidingFeatureDisplay = ({ featureInView }: { featureInView: FeatureType }) => (
  <div
    className="pointer-events-none sticky top-0 z-10 hidden h-screen w-full items-center md:flex"
    style={{ justifyContent: featureInView.contentPosition === 'l' ? 'flex-end' : 'flex-start' }}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="h-fit w-2/5 p-8"
    >
      <FeatureVisual featureInView={featureInView} />
    </motion.div>
  </div>
)

const FeatureContent = ({
  setFeatureInView,
  featureInView,
}: {
  setFeatureInView: Dispatch<SetStateAction<FeatureType>>
  featureInView: FeatureType
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { margin: '-150px' })

  useEffect(() => {
    if (isInView) setFeatureInView(featureInView)
  }, [isInView]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section
      ref={ref}
      className="relative z-0 flex h-fit md:h-screen"
      style={{ justifyContent: featureInView.contentPosition === 'l' ? 'flex-start' : 'flex-end' }}
    >
      <div className="grid h-full w-full place-content-center px-4 py-12 md:w-2/5 md:px-8 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="space-y-4"
        >
          <span className="inline-block rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white tracking-wider uppercase">
            {featureInView.callout}
          </span>
          <h3 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
            {featureInView.title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-sm">
            {featureInView.description}
          </p>
        </motion.div>

        {/* Mobile: show visual inline */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="mt-8 block md:hidden"
        >
          <FeatureVisual featureInView={featureInView} />
        </motion.div>
      </div>
    </section>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export function HowItWorks() {
  const [featureInView, setFeatureInView] = useState<FeatureType>(features[0])

  return (
    <section id="how-it-works" className="bg-[#f8f6f5] dark:bg-[#23140f]">
      {/* Section header */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-20 md:pt-28 pb-4 text-center">
        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Simple process</p>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">How Fluent works</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">
          Four steps. Ten minutes a day. Real results.
        </p>
      </div>

      <div className="relative max-w-6xl mx-auto">
        <SlidingFeatureDisplay featureInView={featureInView} />
        <div className="-mt-[100vh] hidden md:block" />
        {features.map(f => (
          <FeatureContent
            key={f.id}
            featureInView={f}
            setFeatureInView={setFeatureInView}
          />
        ))}
      </div>
    </section>
  )
}
