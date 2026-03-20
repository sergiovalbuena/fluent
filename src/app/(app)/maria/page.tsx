'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { Bot, MessageSquare, Mic, RotateCcw, Target, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Block primitive ───────────────────────────────────────────────────────────
type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps
const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.5, y: 50, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1 },
    }}
    transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
    className={cn(
      'rounded-3xl border border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-[#2c1a12]',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
)

// ── Chat messages ─────────────────────────────────────────────────────────────
type Message = { from: 'maria' | 'user'; text: string; delay: number }

const CHAT: Message[] = [
  {
    from: 'maria',
    text: 'Hola! I\'m MarIA 👋 What would you like to practice today?',
    delay: 0.2,
  },
  {
    from: 'user',
    text: 'Yo quiero ir al mercado hoy.',
    delay: 0.55,
  },
  {
    from: 'maria',
    text: '¡Casi perfecto! 🎉 Small tip: drop the "yo" — the verb already implies the subject. Try: "Quiero ir al mercado hoy." Natural and correct!',
    delay: 0.9,
  },
  {
    from: 'user',
    text: '¿Cuánto cuesta esta manzana?',
    delay: 1.25,
  },
  {
    from: 'maria',
    text: '¡Perfecto! 🌟 That\'s exactly right. You\'re picking this up fast!',
    delay: 1.6,
  },
]

// ── Feature tiles ─────────────────────────────────────────────────────────────
type Feature = { icon: LucideIcon; title: string; description: string; gradient: string; border: string }

const FEATURES: Feature[] = [
  {
    icon: MessageSquare,
    title: 'Free Conversation',
    description: 'Chat freely about any topic. MarIA adapts to your level.',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
    border: 'border-blue-500/20',
  },
  {
    icon: Target,
    title: 'Scenario Practice',
    description: 'Practice real-life situations like ordering food or asking for directions.',
    gradient: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    border: 'border-emerald-500/20',
  },
  {
    icon: Mic,
    title: 'Pronunciation Help',
    description: 'Get instant feedback on how you sound and tips to improve.',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    border: 'border-violet-500/20',
  },
  {
    icon: RotateCcw,
    title: 'Grammar Corrections',
    description: 'MarIA gently corrects your mistakes and explains why.',
    gradient: 'linear-gradient(135deg, #92400e 0%, #c2410c 100%)',
    border: 'border-orange-500/20',
  },
]

const tiltL = { rotate: '2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const
const tiltR = { rotate: '-2.5deg', scale: 1.07, filter: 'brightness(1.14) saturate(1.12)' } as const

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-white/50"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MariaPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar title="MarIA" />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-6xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── MarIA Character Card ─────────────────────────────────────────── */}
          <Block
            className="col-span-12 md:col-span-5 relative overflow-hidden flex flex-col justify-between p-6 md:p-8 min-h-[280px]"
            style={{ background: 'linear-gradient(160deg, #4c0519 0%, #881337 50%, #be123c 100%)' }}
          >
            {/* Grain */}
            <div
              className="absolute inset-0 opacity-[0.035] pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: 'cover',
              }}
            />
            {/* Glow orb */}
            <div className="absolute -top-12 -right-12 size-48 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

            {/* Status */}
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                <span className="size-1.5 rounded-full bg-rose-300/60" />
                Coming soon
              </span>
              <span className="text-[10px] font-bold bg-white/10 border border-white/10 text-white/60 px-2.5 py-1 rounded-full">
                AI Tutor
              </span>
            </div>

            {/* Avatar + name */}
            <div className="relative flex flex-col gap-4">
              <div className="relative w-fit">
                <div className="size-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Bot size={30} className="text-white" />
                </div>
                {/* Pulse ring */}
                <motion.div
                  className="absolute -inset-1 rounded-[18px] border border-white/20"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-none">MarIA</h2>
                <p className="text-sm text-white/50 mt-1.5 leading-snug max-w-[18rem]">
                  Your personal AI language tutor. Practice conversation anytime, get instant corrections, and build real fluency.
                </p>
              </div>
            </div>

            {/* Capability pills */}
            <div className="relative flex flex-wrap gap-1.5">
              {['Grammar', 'Pronunciation', 'Vocabulary', 'Scenarios'].map(tag => (
                <span
                  key={tag}
                  className="text-[10px] font-bold bg-white/10 border border-white/10 text-white/65 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Block>

          {/* ── Chat Preview ─────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-7 flex flex-col overflow-hidden min-h-[280px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.05]"
            >
              <div className="size-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
              >
                <Bot size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">MarIA</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">AI Language Tutor · Preview</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                <Sparkles size={9} />
                Demo
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col gap-3 px-4 py-4 overflow-y-auto">
              {CHAT.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: msg.delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={cn('flex gap-2', msg.from === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  {/* Avatar — MarIA only */}
                  {msg.from === 'maria' && (
                    <div
                      className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
                    >
                      <Bot size={12} className="text-white" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={cn(
                      'max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                      msg.from === 'maria'
                        ? 'bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 rounded-tl-sm'
                        : 'text-white rounded-tr-sm',
                    )}
                    style={msg.from === 'user' ? { background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' } : {}}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.1, duration: 0.3 }}
                className="flex gap-2 items-center"
              >
                <div
                  className="size-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
                >
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-white/[0.07] rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </motion.div>
            </div>

            {/* Fake input bar */}
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.06] rounded-2xl px-4 py-2.5 border border-black/[0.05] dark:border-white/[0.05]">
                <p className="flex-1 text-sm text-slate-400 dark:text-slate-600 select-none">Type a message…</p>
                <div
                  className="size-7 rounded-xl flex items-center justify-center shrink-0 opacity-40"
                  style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
                >
                  <svg viewBox="0 0 24 24" className="size-3.5 fill-white rotate-90" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </Block>

          {/* ── Feature tiles ─────────────────────────────────────────────────── */}
          {FEATURES.map(({ icon: Icon, title, description, gradient, border }, i) => (
            <Block
              key={title}
              whileHover={i % 2 === 0 ? tiltL : tiltR}
              className={cn(
                'col-span-6 md:col-span-3 relative overflow-hidden cursor-pointer min-h-[160px] flex flex-col',
                border
              )}
              style={{ background: gradient }}
            >
              <div className="flex flex-col gap-2.5 p-4 h-full">
                {/* Icon */}
                <div className="size-11 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Icon size={22} className="text-white" />
                </div>
                {/* Title + description */}
                <div className="mt-auto">
                  <p className="text-sm font-bold text-white leading-tight">{title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-snug">{description}</p>
                </div>
              </div>
            </Block>
          ))}

          {/* ── "Be first" CTA ────────────────────────────────────────────────── */}
          <Block className="col-span-12 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {/* Left: text */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
                <Sparkles size={9} />
                Coming soon
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Be the first to try MarIA
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm">
                We're training MarIA to be the best language tutor you've ever had. Stay tuned for early access!
              </p>
            </div>

            {/* Right: fake notify button */}
            <div className="shrink-0 w-full md:w-auto">
              <motion.button
                whileHover={{ scale: 1.03, filter: 'brightness(1.08)' }}
                whileTap={{ scale: 0.97 }}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-sm"
                style={{ background: 'linear-gradient(135deg, #be123c 0%, #db2777 100%)' }}
              >
                <Bot size={16} />
                Notify me when ready
              </motion.button>
            </div>
          </Block>

        </motion.div>
      </main>
    </div>
  )
}
