'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight, BookOpen, CalendarClock, Gamepad2, Gem, Lightbulb, Lock, Snowflake, Sparkles, Unlock, X, Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/layout/app-topbar'
import { createClient } from '@/lib/supabase/client'
import { buyItem, DAILY_GEM_CAP, MAX_STREAK_FREEZES, PRICES, type ShopItem } from '@/lib/rewards'

export type GemTransaction = { id: string; amount: number; reason: string; created_at: string }
export type DailyTip = { text: string; lessonNumber: number; lessonTitle: string; slug: string }

type Props = {
  signedIn: boolean
  totalGems: number
  streakFreezes: number
  /** Active boosts: boost → expiry (ms) */
  boosts: Record<string, number>
  earnedToday: number
  history: GemTransaction[]
  dailyTip: DailyTip | null
}

// One colour for the currency everywhere (matches the 💎 emoji and the topbar chip)
const GEM = 'text-sky-500'

const ITEMS: { id: ShopItem; icon: LucideIcon; tint: string; boost?: 'xp' | 'gems' }[] = [
  { id: 'xp_boost',      icon: Zap,       tint: 'bg-amber-400/15 text-amber-500',   boost: 'xp' },
  { id: 'gems_boost',    icon: Gem,       tint: 'bg-sky-500/15 text-sky-500',       boost: 'gems' },
  { id: 'streak_freeze', icon: Snowflake, tint: 'bg-cyan-400/15 text-cyan-500' },
  { id: 'unlock_module', icon: Unlock,    tint: 'bg-violet-500/15 text-violet-500' },
]

const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <motion.section
    variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={cn('rounded-3xl border border-black/[0.04] dark:border-white/[0.06] bg-white dark:bg-[#202638] shadow-[0_2px_10px_rgba(0,0,0,0.04)]', className)}
  >
    {children}
  </motion.section>
)

function useNow(intervalMs: number) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function GemAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums', className)}>
      <Gem size={13} className={GEM} />{value}
    </span>
  )
}

export function GemsPageContent({ signedIn, totalGems, streakFreezes, boosts, earnedToday, history, dailyTip }: Props) {
  const t = useTranslations('gems')
  const locale = useLocale()
  const router = useRouter()
  const now = useNow(1000)
  const [gems, setGems] = useState(totalGems)
  const [freezes, setFreezes] = useState(streakFreezes)
  const [activeBoosts, setActiveBoosts] = useState(boosts)
  const [confirming, setConfirming] = useState<ShopItem | null>(null)
  const [buying, setBuying] = useState(false)

  const unlockPrice = PRICES.unlock_module
  const goalPct = Math.min(100, Math.round((gems / unlockPrice) * 100))
  const itemName = (id: ShopItem) => t(`item_${id}`)

  async function confirmPurchase() {
    if (!confirming) return
    setBuying(true)
    const res = await buyItem(createClient(), confirming)
    setBuying(false)
    if ('error' in res) {
      toast.error(t(`err_${res.error}`))
      setConfirming(null)
      return
    }
    setGems(res.balance)
    if (confirming === 'streak_freeze') setFreezes(f => f + 1)
    if (confirming === 'xp_boost') setActiveBoosts(b => ({ ...b, xp: Date.now() + 15 * 60_000 }))
    if (confirming === 'gems_boost') setActiveBoosts(b => ({ ...b, gems: Date.now() + 30 * 60_000 }))
    toast.success(t('bought', { item: itemName(confirming) }))
    setConfirming(null)
    router.refresh()   // topbar balance, history
  }

  const earnRows = [
    { icon: BookOpen,      label: t('earn_lesson'), note: t('earn_lesson_note'), value: '+2' },
    { icon: Gamepad2,      label: t('earn_game'),   note: null,                  value: '+3' },
    { icon: Gem,           label: t('earn_boost'),  note: null,                  value: '×2' },
    { icon: CalendarClock, label: t('earn_cap'),    note: t('today', { earned: earnedToday, cap: DAILY_GEM_CAP }), value: String(DAILY_GEM_CAP) },
  ]

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />

      <main className="flex-1 px-3 md:px-6 py-4 md:py-8 pb-28 md:pb-10">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.06 }}
          className="mx-auto max-w-5xl grid grid-cols-12 gap-3 md:gap-4"
        >

          {/* ── Balance + next goal ─────────────────────────────────────────── */}
          <motion.section
            variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }}
            className="col-span-12 md:col-span-7 relative overflow-hidden rounded-3xl p-6 md:p-7 text-white shadow-[0_6px_0_#0369a1,0_20px_40px_-18px_rgba(14,165,233,0.8)]"
            style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 45%, #0369a1 100%)' }}
          >
            <span aria-hidden className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.2px, transparent 0)', backgroundSize: '16px 16px' }} />
            <Gem aria-hidden size={180} strokeWidth={1.2} className="absolute -right-8 -bottom-10 text-white/15 rotate-12" />

            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">{t('balance')}</p>
              <div className="mt-2 flex items-end gap-3">
                <motion.span
                  key={gems}
                  initial={{ scale: 1.15, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-bold leading-none tabular-nums"
                >
                  {gems}
                </motion.span>
                <span className="text-4xl leading-none mb-1">💎</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/20 px-3 py-1">{t('today', { earned: earnedToday, cap: DAILY_GEM_CAP })}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">🧊 {t('freezes', { count: freezes, max: MAX_STREAK_FREEZES })}</span>
              </div>

              {/* Goal: unlocking a lesson early ties gems back into the learning path */}
              <div className="mt-6 rounded-2xl bg-black/15 p-4">
                <div className="flex items-center gap-3">
                  <span className="size-10 shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
                    {gems >= unlockPrice ? <Unlock size={18} /> : <Lock size={18} />}
                  </span>
                  <p className="flex-1 text-sm font-semibold leading-snug">
                    {gems >= unlockPrice ? t('goal_ready') : t('goal_need', { missing: unlockPrice - gems })}
                  </p>
                  <Link href="/learn" className="shrink-0 hidden sm:inline-flex items-center gap-1 rounded-full bg-white text-sky-700 px-3.5 py-1.5 text-xs font-bold shadow-[0_3px_0_rgba(0,0,0,0.15)]">
                    {t('goal_cta')} <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-black/20 overflow-hidden p-0.5">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${goalPct}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-white/80 tabular-nums">{Math.min(gems, unlockPrice)} / {unlockPrice}</p>
              </div>
            </div>
          </motion.section>

          {/* ── How to earn ─────────────────────────────────────────────────── */}
          <Card className="col-span-12 md:col-span-5 p-5 md:p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('how_title')}</h2>
            <ul className="mt-4 space-y-3">
              {earnRows.map(row => (
                <li key={row.label} className="flex items-center gap-3">
                  <span className="size-9 shrink-0 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <row.icon size={16} className={GEM} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">{row.label}</span>
                    {row.note && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{row.note}</span>}
                  </span>
                  <span className={cn('text-sm font-bold tabular-nums', GEM)}>{row.value}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* ── Shop ────────────────────────────────────────────────────────── */}
          <div className="col-span-12 mt-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 px-1">{t('shop')}</h2>
          </div>

          {ITEMS.map(item => {
            const price = PRICES[item.id]
            const boostLeft = item.boost ? (activeBoosts[item.boost] ?? 0) - now : 0
            const active = !!item.boost && boostLeft > 0
            const maxed = item.id === 'streak_freeze' && freezes >= MAX_STREAK_FREEZES
            const missing = Math.max(0, price - gems)
            const Icon = item.icon
            return (
              <Card key={item.id} className="col-span-12 sm:col-span-6 lg:col-span-3 p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <span className={cn('size-11 rounded-2xl flex items-center justify-center', item.tint)}><Icon size={20} /></span>
                  <GemAmount value={price} className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sm text-slate-800 dark:text-slate-100" />
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-slate-900 dark:text-white">{itemName(item.id)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 flex-1">{t(`item_${item.id}_desc`)}</p>
                {item.id === 'streak_freeze' && (
                  <p className="mt-2 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">🧊 {t('owned', { count: freezes, max: MAX_STREAK_FREEZES })}</p>
                )}

                <div className="mt-4">
                  {item.id === 'unlock_module' ? (
                    <Link href="/learn" className="flex items-center justify-center gap-1.5 w-full h-10 rounded-xl bg-violet-500 text-white text-sm font-bold shadow-[0_3px_0_#6d28d9] active:translate-y-0.5 transition-transform">
                      {t('choose_on_map')} <ArrowRight size={14} />
                    </Link>
                  ) : active ? (
                    <p className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold tabular-nums">
                      <Sparkles size={14} /> {t('active_for', { time: mmss(boostLeft) })}
                    </p>
                  ) : maxed ? (
                    <p className="flex items-center justify-center h-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 text-sm font-semibold">{t('max_owned')}</p>
                  ) : (
                    <button
                      onClick={() => signedIn ? setConfirming(item.id) : toast.error(t('sign_in'))}
                      disabled={missing > 0}
                      className={cn(
                        'w-full h-10 rounded-xl text-sm font-bold transition-transform',
                        missing > 0
                          ? 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-sky-500 text-white shadow-[0_3px_0_#0369a1] active:translate-y-0.5',
                      )}
                    >
                      {missing > 0 ? t('missing', { missing }) : t('buy')}
                    </button>
                  )}
                </div>
              </Card>
            )
          })}

          {/* ── History ─────────────────────────────────────────────────────── */}
          <Card className="col-span-12 md:col-span-7 p-5 md:p-6 mt-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('history')}</h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('history_empty')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {history.map(tx => (
                  <li key={tx.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {t.has(`reason_${tx.reason}`) ? t(`reason_${tx.reason}`) : tx.reason}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">{dateFmt.format(new Date(tx.created_at))}</span>
                    </span>
                    <span className={cn('text-sm font-bold tabular-nums', tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 💎
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ── Tip of the day (from the course) ────────────────────────────── */}
          {dailyTip && (
            <Card className="col-span-12 md:col-span-5 p-5 md:p-6 mt-2 bg-amber-50 dark:bg-[#2a2620] border-amber-200/60 dark:border-amber-500/15">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('tip_of_day')}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{dailyTip.text}</p>
              <Link href={`/learn/${dailyTip.slug}`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">
                {t('tip_from', { n: String(dailyTip.lessonNumber).padStart(2, '0'), title: dailyTip.lessonTitle })} <ArrowRight size={12} />
              </Link>
            </Card>
          )}

          {/* ── Extra content (not built yet) ───────────────────────────────── */}
          <div className="col-span-12 mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles size={14} className="shrink-0 text-violet-500" />
            {t('extra_soon')}
          </div>
        </motion.div>
      </main>

      {/* ── Purchase confirmation ─────────────────────────────────────────── */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget && !buying) setConfirming(null) }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ y: 30, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 30, scale: 0.97 }}
              className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#202638] p-6 text-center shadow-2xl"
            >
              <button onClick={() => setConfirming(null)} aria-label={t('cancel')} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
              {(() => {
                const item = ITEMS.find(i => i.id === confirming)!
                const Icon = item.icon
                return <span className={cn('mx-auto size-14 rounded-2xl flex items-center justify-center', item.tint)}><Icon size={26} /></span>
              })()}
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{t('confirm_title', { item: itemName(confirming) })}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {t('confirm_body', { price: PRICES[confirming], after: gems - PRICES[confirming] })}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button onClick={() => setConfirming(null)} disabled={buying} className="h-11 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t('cancel')}
                </button>
                <button onClick={confirmPurchase} disabled={buying} className="h-11 rounded-xl bg-sky-500 text-white text-sm font-bold shadow-[0_3px_0_#0369a1] disabled:opacity-60">
                  {t('confirm', { price: PRICES[confirming] })} 💎
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
