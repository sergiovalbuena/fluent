'use client'

import { motion, type Variants } from 'framer-motion'
import { Star, Flame, Gem, Zap, Bookmark, Bot, MapPin, Volume2, Keyboard } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

// ── Challenge Mode ────────────────────────────────────────────────────────────
function ChallengeCard() {
  const word  = 'La familia'
  const typed = 'La fami'

  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-7 bg-[#0f0805] border border-white/[0.07] rounded-3xl p-6 overflow-hidden">
      <div className="flex items-start gap-3 mb-5">
        <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Keyboard size={15} className="text-primary" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Challenge Mode</p>
          <p className="text-slate-500 text-xs mt-0.5">MonkeyType-style typing — 3 rounds per word until mastered</p>
        </div>
      </div>

      {/* Round pills */}
      <div className="flex items-center gap-2 mb-4">
        {['Full word', '50% hidden', 'Almost blind'].map((r, i) => (
          <div key={r} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
            i === 0 ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 border border-white/5'
          }`}>
            {r}
          </div>
        ))}
      </div>

      {/* Typing area */}
      <div className="bg-[#1a0d07] rounded-2xl p-5 border border-white/[0.05] mb-4">
        <p className="text-center text-slate-500 text-xs mb-3">Family · 👨‍👩‍👧</p>
        <div className="flex items-center justify-center gap-0.5 text-3xl font-bold tracking-wide mb-3 select-none">
          {word.split('').map((ch, i) => (
            <span key={i} className={
              i < typed.length
                ? 'text-lime-400'
                : i === typed.length
                  ? 'text-white/20'
                  : 'text-white/12'
            }>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-primary/80 rounded-full transition-all" style={{ width: `${(typed.length / word.length) * 100}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 tabular-nums">{typed.length}/{word.length}</span>
        </div>
      </div>

      {/* Word chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { w: 'La abuela',  mastered: true  },
          { w: 'El abuelo',  mastered: true  },
          { w: 'La madre',   mastered: false, active: true },
          { w: 'El padre',   mastered: false },
          { w: 'La hermana', mastered: false },
        ].map(entry => (
          <div key={entry.w} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            entry.mastered ? 'bg-lime-500/10 border-lime-500/20 text-lime-400' :
            entry.active   ? 'bg-primary/15 border-primary/25 text-primary' :
            'bg-white/4 border-white/[0.05] text-slate-500'
          }`}>
            {entry.mastered && <Star size={9} className="fill-yellow-500 text-yellow-500 shrink-0" />}
            {entry.w}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── MarIA AI ──────────────────────────────────────────────────────────────────
function MarIACard() {
  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-5 bg-gradient-to-br from-violet-950/60 to-indigo-950/40 border border-violet-500/15 rounded-3xl p-6 overflow-hidden">
      <div className="flex items-start gap-3 mb-5">
        <div className="size-8 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
          <Bot size={15} className="text-violet-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">MarIA</p>
          <p className="text-violet-400/60 text-xs mt-0.5">AI conversation tutor — always patient</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-violet-500/15 border border-violet-500/15 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
            <p className="text-white text-xs">¿Cómo se dice &quot;I&apos;m hungry&quot;?</p>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="size-7 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
            <Bot size={13} className="text-violet-400" />
          </div>
          <div className="bg-white/[0.05] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
            <p className="text-white text-xs leading-relaxed">
              Se dice <span className="text-violet-300 font-bold">&quot;Tengo hambre&quot;</span>. Spanish uses <em className="text-slate-300">tener</em> for feelings — literally &quot;I have hunger&quot; 😄
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-violet-500/15 border border-violet-500/15 rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-white text-xs">Tengo hambre! Got it 🙌</p>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="size-7 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
            <Bot size={13} className="text-violet-400" />
          </div>
          <div className="bg-white/[0.05] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-2.5">
            <p className="text-white text-xs">¡Perfecto! Now try: <span className="text-violet-300 font-bold">Tengo sed</span> 💧</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Gamification ──────────────────────────────────────────────────────────────
function GamificationCard() {
  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-4 bg-[#0f0805] border border-white/[0.07] rounded-3xl p-6">
      <p className="text-white font-bold text-sm mb-4">Earn as you learn</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { Icon: Flame,  value: '12', label: 'Streak', cls: 'text-orange-500 fill-orange-500', bg: 'bg-orange-500/10 border-orange-500/15' },
          { Icon: Star,   value: '420', label: 'XP',    cls: 'text-yellow-500 fill-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/15' },
          { Icon: Gem,    value: '85', label: 'Gems',   cls: 'text-amber-500',                  bg: 'bg-amber-500/10 border-amber-500/15'  },
        ].map(({ Icon, value, label, cls, bg }) => (
          <div key={label} className={`rounded-2xl p-3 text-center border ${bg}`}>
            <Icon size={18} className={`${cls} mx-auto mb-1.5`} />
            <p className="text-lg font-bold text-white leading-none">{value}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">This week</p>
        <div className="flex items-end justify-between gap-1 h-14">
          {[45, 80, 35, 100, 60, 90, 25].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full rounded-t-sm"
                style={{ height: `${h}%`, background: h >= 60 ? '#ff8052' : 'rgba(255,128,82,0.18)' }} />
              <span className="text-[8px] text-slate-600">{['M','T','W','T','F','S','S'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Travel Mode ───────────────────────────────────────────────────────────────
function TravelCard() {
  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-4 bg-gradient-to-br from-emerald-950/50 to-teal-950/40 border border-emerald-500/15 rounded-3xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <MapPin size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Travel Mode</p>
          <p className="text-emerald-400/60 text-xs mt-0.5">Survival kit for your next trip</p>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { emoji: '🍽️', text: 'Order at a restaurant', done: true  },
          { emoji: '🚕', text: 'Get a taxi',             done: true  },
          { emoji: '🏨', text: 'Check into a hotel',     done: false },
          { emoji: '🗺️', text: 'Ask for directions',    done: false },
        ].map(it => (
          <div key={it.text} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
            it.done ? 'bg-emerald-500/8 border-emerald-500/15' : 'bg-white/[0.03] border-white/[0.04]'
          }`}>
            <span className="text-sm">{it.emoji}</span>
            <p className={`text-xs font-semibold flex-1 ${it.done ? 'text-emerald-300' : 'text-slate-400'}`}>{it.text}</p>
            {it.done && (
              <div className="size-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-[8px] font-black text-emerald-400">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Story Mode ────────────────────────────────────────────────────────────────
function StoriesCard() {
  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-4 bg-gradient-to-br from-blue-950/50 to-indigo-950/40 border border-blue-500/15 rounded-3xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 text-base leading-none">
          📖
        </div>
        <div>
          <p className="text-white font-bold text-sm">Story Mode</p>
          <p className="text-blue-400/60 text-xs mt-0.5">Read · Listen · Absorb in context</p>
        </div>
      </div>

      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 mb-3">
        <p className="text-xs text-slate-300 leading-relaxed">
          La{' '}<span className="bg-primary/25 text-primary px-1.5 py-0.5 rounded font-semibold">familia</span>{' '}
          García vive en Madrid.{' '}
          <span className="bg-primary/25 text-primary px-1.5 py-0.5 rounded font-semibold">La abuela</span>{' '}
          cocina paella todos los domingos.{' '}
          <span className="bg-primary/25 text-primary px-1.5 py-0.5 rounded font-semibold">Los niños</span>{' '}
          la adoran.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/12 text-blue-300 text-xs font-bold border border-blue-500/15">
          <Volume2 size={11} />
          Listen
        </button>
        <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400/50 rounded-full w-[45%]" />
        </div>
        <span className="text-[10px] text-slate-500">0:23</span>
      </div>
    </motion.div>
  )
}

// ── Saved Items ───────────────────────────────────────────────────────────────
function SavedCard() {
  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-6 bg-[#0f0805] border border-white/[0.07] rounded-3xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Bookmark size={15} className="text-primary fill-primary" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Saved Items</p>
          <p className="text-slate-500 text-xs mt-0.5">Bookmark words, phrases &amp; story highlights for review</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { type: 'word',   text: 'La abuela',     tr: 'Grandmother'  },
          { type: 'phrase', text: '¿Cómo estás?',  tr: 'How are you?' },
          { type: 'word',   text: 'El abuelo',     tr: 'Grandfather'  },
          { type: 'story',  text: 'Los niños',     tr: 'The children' },
        ].map((it, i) => {
          const accent =
            it.type === 'word'   ? { bg: 'bg-primary/8 border-primary/15',          icon: 'text-primary',      fill: 'fill-primary'      } :
            it.type === 'phrase' ? { bg: 'bg-blue-500/8 border-blue-500/15',         icon: 'text-blue-400',     fill: 'fill-blue-400'     } :
                                   { bg: 'bg-emerald-500/8 border-emerald-500/15',   icon: 'text-emerald-400',  fill: 'fill-emerald-400'  }
          return (
            <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border ${accent.bg}`}>
              <Bookmark size={10} className={`mt-0.5 shrink-0 ${accent.icon} ${accent.fill}`} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{it.text}</p>
                <p className="text-[10px] text-slate-500 truncate">{it.tr}</p>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── Daily Challenge ───────────────────────────────────────────────────────────
function DailyChallengeCard() {
  return (
    <motion.div variants={item}
      className="col-span-12 md:col-span-6 bg-gradient-to-br from-rose-950/50 to-orange-950/40 border border-rose-500/15 rounded-3xl p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
            <Zap size={15} className="text-rose-400 fill-rose-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Daily Challenge</p>
            <p className="text-rose-400/60 text-xs mt-0.5">5 min · Bonus XP &amp; Gems</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-rose-300 tabular-nums">3 / 5</p>
          <p className="text-[10px] text-slate-500">done today</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {[true, true, true, false, false].map((done, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${done ? 'bg-rose-400' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Today&apos;s challenge</p>
        <p className="text-white text-sm font-semibold leading-snug">Translate 5 family phrases without hints</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1 text-yellow-400">
              <Star size={11} className="fill-yellow-500 text-yellow-500" />+15 XP
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Gem size={11} />+5
            </span>
          </div>
          <button className="bg-rose-500/15 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-500/15 hover:bg-rose-500/25 transition-colors">
            Start →
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export function FeaturesBento() {
  return (
    <section id="features" className="relative">
      {/* Fade transition from light → dark */}
      <div className="h-24 bg-gradient-to-b from-[#f8f6f5] dark:from-[#23140f] to-[#0f0805]" />

      <div className="bg-[#0f0805] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">A complete learning system</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm">
              Every feature is designed to build real vocabulary and communication skills — not just app engagement.
            </p>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-12 gap-4"
          >
            <ChallengeCard />
            <MarIACard />
            <GamificationCard />
            <TravelCard />
            <StoriesCard />
            <SavedCard />
            <DailyChallengeCard />
          </motion.div>
        </div>
      </div>

      {/* Fade back to light */}
      <div className="h-24 bg-gradient-to-b from-[#0f0805] to-[#f8f6f5] dark:to-[#23140f]" />
    </section>
  )
}
