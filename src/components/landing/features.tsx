'use client'

import { memo, useRef } from 'react'
import { useMotionValue, motion, useSpring, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

type FeatureItem = {
  heading: string
  subheading: string
  emoji: string
  gradient: string
  href: string
}

const features: FeatureItem[] = [
  {
    heading: 'Vocabulary',
    subheading: 'Learn words with visual flashcards and spaced repetition',
    emoji: '🗂️',
    gradient: 'from-orange-400 to-primary',
    href: '/dashboard',
  },
  {
    heading: 'Phrases',
    subheading: 'Practice real everyday expressions you will actually use',
    emoji: '💬',
    gradient: 'from-blue-400 to-indigo-500',
    href: '/dashboard',
  },
  {
    heading: 'Q&A Quizzes',
    subheading: 'Reinforce knowledge with interactive multiple-choice questions',
    emoji: '❓',
    gradient: 'from-violet-400 to-purple-600',
    href: '/dashboard',
  },
  {
    heading: 'Story Mode',
    subheading: 'Read short stories in context, then write your own sentences',
    emoji: '📖',
    gradient: 'from-emerald-400 to-teal-500',
    href: '/dashboard',
  },
  {
    heading: 'Streaks',
    subheading: 'Build a daily habit with streak tracking and XP rewards',
    emoji: '🔥',
    gradient: 'from-red-400 to-orange-500',
    href: '/dashboard',
  },
  {
    heading: 'Progress',
    subheading: 'Track accuracy, weekly activity, and words learned over time',
    emoji: '📊',
    gradient: 'from-cyan-400 to-blue-500',
    href: '/dashboard',
  },
]

interface LinkProps extends FeatureItem {}

const FeatureLink = memo(({ heading, subheading, emoji, gradient, href }: LinkProps) => {
  const ref = useRef<HTMLAnchorElement | null>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x)
  const mouseYSpring = useSpring(y)

  const top = useTransform(mouseYSpring, [0.5, -0.5], ['40%', '60%'])
  const left = useTransform(mouseXSpring, [0.5, -0.5], ['60%', '70%'])

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = ref.current!.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <motion.a
      href={href}
      ref={ref}
      onMouseMove={handleMouseMove}
      initial="initial"
      whileHover="whileHover"
      className="group relative flex items-center justify-between border-b border-slate-700 py-5 md:py-7 transition-colors duration-500 hover:border-slate-400"
    >
      <div>
        <motion.span
          variants={{
            initial: { x: 0 },
            whileHover: { x: -16 },
          }}
          transition={{ type: 'spring', staggerChildren: 0.05, delayChildren: 0.15 }}
          className="relative z-10 block text-3xl font-bold text-slate-500 transition-colors duration-500 group-hover:text-slate-50 md:text-5xl"
        >
          {heading.split('').map((l, i) => (
            <motion.span
              key={i}
              variants={{ initial: { x: 0 }, whileHover: { x: 16 } }}
              transition={{ type: 'spring' }}
              className="inline-block"
            >
              {l === ' ' ? '\u00A0' : l}
            </motion.span>
          ))}
        </motion.span>
        <span className="relative z-10 mt-1.5 block text-sm text-slate-600 transition-colors duration-500 group-hover:text-slate-400">
          {subheading}
        </span>
      </div>

      {/* Hover preview — gradient card with emoji */}
      <motion.div
        style={{ top, left, translateX: '-50%', translateY: '-50%' }}
        variants={{
          initial: { scale: 0, rotate: '-12.5deg' },
          whileHover: { scale: 1, rotate: '12.5deg' },
        }}
        transition={{ type: 'spring' }}
        className={`absolute z-0 h-24 w-36 md:h-40 md:w-56 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl pointer-events-none`}
      >
        <span className="text-5xl md:text-6xl drop-shadow-lg">{emoji}</span>
      </motion.div>

      {/* Arrow */}
      <motion.div
        variants={{ initial: { x: '25%', opacity: 0 }, whileHover: { x: '0%', opacity: 1 } }}
        transition={{ type: 'spring' }}
        className="relative z-10 p-4"
      >
        <ArrowRight className="text-3xl md:text-4xl text-primary" />
      </motion.div>
    </motion.a>
  )
})

export function Features() {
  return (
    <section id="features" className="bg-slate-900 px-4 md:px-8 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 md:mb-16 text-center">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">A complete learning system</h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto text-sm">
            Every feature is designed to reinforce vocabulary and build real communication skills.
          </p>
        </div>
        {features.map(f => (
          <FeatureLink key={f.heading} {...f} />
        ))}
      </div>
    </section>
  )
}
