'use client'

import React from 'react'
import { motion, type MotionProps } from 'framer-motion'
import { ArrowLeft, Zap, Star, Gem, Flame, Brain } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'

// ── Block primitive ────────────────────────────────────────────────────────────
type BlockProps = { className?: string; children?: React.ReactNode } & MotionProps
const Block = ({ className, children, ...rest }: BlockProps) => (
  <motion.div
    variants={{
      initial: { scale: 0.95, y: 24, opacity: 0 },
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

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      variants={{ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.3 }}
      className="col-span-12 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 pt-2"
    >
      {children}
    </motion.p>
  )
}

// ── XP row ─────────────────────────────────────────────────────────────────────
function XpRow({ action, xp, subtle }: { action: string; xp: string; subtle?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0',
      subtle && 'opacity-60'
    )}>
      <span className="text-sm text-slate-700 dark:text-slate-300">{action}</span>
      <span className="text-sm font-bold text-amber-500 tabular-nums">{xp}</span>
    </div>
  )
}

// ── Star tier ─────────────────────────────────────────────────────────────────
function StarTier({ stars, label, detail }: { stars: number; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
      <div className="flex gap-0.5 shrink-0 mt-0.5">
        {[1, 2, 3].map(n => (
          <Star
            key={n}
            size={14}
            className={n <= stars
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}

// ── Skill chip ─────────────────────────────────────────────────────────────────
function SkillRow({ skill, activities, color }: { skill: string; activities: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
      <div className={cn('size-2.5 rounded-full shrink-0', color)} />
      <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize w-24 shrink-0">{skill}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500">{activities}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PointsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#1c0e09]">
      <AppTopbar back={{ href: '/progress', label: 'Progress' }} />

      <main className="flex-1 px-3 md:px-5 py-4 md:py-6">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.05 }}
          className="mx-auto max-w-3xl grid grid-flow-dense grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Hero ──────────────────────────────────────────────────────────── */}
          <Block
            className="col-span-12 relative overflow-hidden flex flex-col gap-2 p-6 md:p-8"
            style={{ background: 'linear-gradient(135deg, #1c0704 0%, #7c2d12 55%, #9a3412 100%)' }}
          >
            <div className="absolute right-6 bottom-4 pointer-events-none select-none opacity-[0.07]">
              <Zap size={120} className="text-white" />
            </div>
            <Link href="/progress" className="flex items-center gap-1.5 text-white/45 text-xs font-semibold hover:text-white/70 transition-colors w-fit mb-1">
              <ArrowLeft size={12} /> Progress
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Points & Progression</h1>
            <p className="text-sm text-white/50 max-w-md leading-relaxed">
              Everything you do earns rewards. Simple to understand, deep by design.
            </p>
          </Block>

          {/* ── XP Sources ────────────────────────────────────────────────────── */}
          <SectionLabel>XP Sources</SectionLabel>

          <Block className="col-span-12 p-5 md:p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap size={16} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">XP Sources</p>
            </div>
            <XpRow action="Complete core activity"    xp="+10 XP" />
            <XpRow action="Lesson completion (1st time)" xp="+20 XP" />
            <XpRow action="Earn 3 stars ⭐⭐⭐"        xp="+10 XP" />
            <XpRow action="Streak day (1st of day)"   xp="+5 XP" />
            <XpRow action="Extra activity / game"     xp="+5 XP" subtle />
            <XpRow action="Crown challenge ≥ 85%"     xp="+20 XP" subtle />
          </Block>

          {/* ── Streak Milestones ─────────────────────────────────────────────── */}
          <SectionLabel>Streak Milestones</SectionLabel>

          <Block
            className="col-span-12 relative overflow-hidden p-5 md:p-6"
            style={{ background: 'linear-gradient(135deg, #1c0704 0%, #7c2d12 60%, #c2410c 100%)' }}
          >
            <div className="absolute right-4 top-4 pointer-events-none select-none opacity-[0.08]">
              <Flame size={80} className="text-white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-4">One-time bonus per milestone</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { day: 3,  bonus: '+10 XP', emoji: '🔥' },
                { day: 7,  bonus: '+20 XP', emoji: '🔥🔥' },
                { day: 14, bonus: '+50 XP', emoji: '🔥🔥🔥' },
              ].map(({ day, bonus, emoji }) => (
                <div key={day} className="bg-white/10 rounded-2xl p-4 flex flex-col gap-1.5">
                  <p className="text-xs">{emoji}</p>
                  <p className="text-lg font-bold text-white">Day {day}</p>
                  <p className="text-sm font-bold text-orange-300">{bonus}</p>
                  <p className="text-[10px] text-white/40">streak bonus</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/30 mt-4">Resets if you break your streak. Each milestone is awarded only once per run.</p>
          </Block>

          {/* ── Stars ─────────────────────────────────────────────────────────── */}
          <SectionLabel>Stars per Lesson</SectionLabel>

          <Block className="col-span-12 md:col-span-6 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <Star size={16} className="text-amber-400" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">How stars are earned</p>
            </div>
            <StarTier stars={1} label="Complete core activity" detail="Finish the main lesson activity" />
            <StarTier stars={2} label="Core + 1 extra activity" detail="Explore an additional game or exercise" />
            <StarTier stars={3} label="Core + 2 extras + score ≥ 80%" detail="Full exploration with strong performance" />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
              Stars never go down. Your best run is kept forever.
            </p>
          </Block>

          {/* ── Gems ──────────────────────────────────────────────────────────── */}
          <Block className="col-span-12 md:col-span-6 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                <Gem size={16} className="text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Earning gems 💎</p>
            </div>
            <XpRow action="Complete a minigame"   xp="+3 gems" />
            <XpRow action="Repeat an exercise"    xp="+1 gem" />
            <XpRow action="Perfect score (100%)"  xp="+2 gems" />
            <div className="mt-4 p-3 rounded-2xl bg-cyan-400/[0.06] border border-cyan-400/10">
              <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Coming soon</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spend gems on boosts — 2× XP, retry without penalty, and more.
              </p>
            </div>
          </Block>

          {/* ── Crown ─────────────────────────────────────────────────────────── */}
          <SectionLabel>Crown — Lesson Mastery</SectionLabel>

          <Block
            className="col-span-12 relative overflow-hidden p-5 md:p-6"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 80%, #4f46e5 100%)' }}
          >
            <div className="absolute right-5 bottom-4 pointer-events-none select-none text-5xl opacity-[0.12]">👑</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">How to earn a crown</p>
            <p className="text-2xl font-bold text-white mb-1">Pass the Challenge</p>
            <p className="text-sm text-white/55 leading-relaxed max-w-sm">
              At the end of each lesson a final challenge unlocks. Score <span className="text-white font-bold">≥ 85%</span> to earn the crown — proof you can use it in real life.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Coming in a future update</span>
            </div>
          </Block>

          {/* ── Skills ────────────────────────────────────────────────────────── */}
          <SectionLabel>Skills (Internal)</SectionLabel>

          <Block className="col-span-12 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Brain size={16} className="text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Skill tracking</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Used to personalize your learning path</p>
              </div>
            </div>
            <SkillRow skill="Vocabulary" activities="Vocabulary lessons, phrases, Q&A" color="bg-indigo-500" />
            <SkillRow skill="Grammar"    activities="Q&A, arrange sentences, translate"  color="bg-purple-500" />
            <SkillRow skill="Listening"  activities="Story lessons"                      color="bg-teal-500" />
            <SkillRow skill="Speaking"   activities="Phrases, translate"                 color="bg-rose-500" />
            <div className="mt-4 p-3 rounded-2xl bg-violet-500/[0.06] border border-violet-500/10">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Phase 1 — tracking only</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Skills are tracked behind the scenes and will power personalized recommendations in a future update.
              </p>
            </div>
          </Block>

          {/* ── Footer note ───────────────────────────────────────────────────── */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
            className="col-span-12 px-1 pb-4"
          >
            <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center leading-relaxed">
              The system is designed to always give you something for your time. Every activity counts.
            </p>
          </motion.div>

        </motion.div>
      </main>
    </div>
  )
}
