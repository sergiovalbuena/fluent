'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { toast } from 'sonner'
import {
  BookOpen, Check, Copy, Crown, Flame, GraduationCap, KeyRound, LogOut, MoreHorizontal, Pencil, RefreshCw,
  Share2, ShieldCheck, Sparkles, Target, Trophy, UserMinus, UserPlus, Users, X, Zap,
} from 'lucide-react'
import { AppTopbar } from '@/components/layout/app-topbar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useActiveLanguage } from '@/components/providers/language-provider'
import { createClient } from '@/lib/supabase/client'
import { getLanguage } from '@/lib/languages'
import { explanationLanguage, loadGrammarIndex } from '@/lib/grammar'
import {
  GROUP_MAX_MEMBERS, WEEKLY_XP_PER_MEMBER, createGroup, daysLeftInWeek, getFeed, getGroup, inviteLink, joinGroup, leaveGroup,
  newInviteCode, removeMember, renameGroup, weeklyGoal,
  type FeedEvent, type GroupError, type GroupMember, type StudyGroup,
} from '@/lib/study-group'
import { cn } from '@/lib/utils'

// ── Motion (same language as /mini-games and the lesson bento) ────────────────
const card: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}
const SURFACE = 'rounded-3xl border border-black/[0.04] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] dark:border-white/[0.05] dark:bg-[#202638]'
const LABEL = 'text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400'

// ── Page ──────────────────────────────────────────────────────────────────────

type Loaded = { group: StudyGroup | null; feed: FeedEvent[]; failed: boolean }

async function loadGroup(): Promise<Loaded> {
  const supabase = createClient()
  try {
    const group = await getGroup(supabase)
    return { group, feed: group ? await getFeed(supabase) : [], failed: false }
  } catch {
    return { group: null, feed: [], failed: true }
  }
}

export function CommunityContent() {
  const t = useTranslations('community')
  // undefined: loading · null: not in a group
  const [group, setGroup] = useState<StudyGroup | null | undefined>(undefined)
  const [feed, setFeed] = useState<FeedEvent[]>([])

  const show = useCallback((data: Loaded) => {
    setGroup(data.group)
    setFeed(data.feed)
    if (data.failed) toast.error(t('err_unknown'))
  }, [t])

  useEffect(() => {
    let cancelled = false
    loadGroup().then(data => { if (!cancelled) show(data) })
    return () => { cancelled = true }
  }, [show])

  /** After an action: reload the group */
  const refresh = useCallback(async () => show(await loadGroup()), [show])

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4f2] dark:bg-[#171b28]">
      <AppTopbar title={t('title')} />
      <main className="flex-1 px-3 py-4 md:px-5 md:py-6">
        {group === undefined ? (
          <div className="mx-auto grid max-w-6xl grid-cols-12 gap-3 md:gap-4">
            <div className="col-span-12 h-72 animate-pulse rounded-3xl bg-white/70 dark:bg-white/[0.04] lg:col-span-8" />
            <div className="col-span-12 h-72 animate-pulse rounded-3xl bg-white/70 dark:bg-white/[0.04] lg:col-span-4" />
          </div>
        ) : group === null ? (
          <NoGroup onDone={refresh} />
        ) : (
          <GroupView group={group} feed={feed} onChange={refresh} />
        )}
      </main>
    </div>
  )
}

// ── Without a group ───────────────────────────────────────────────────────────

function NoGroup({ onDone }: { onDone: () => Promise<void> }) {
  const t = useTranslations('community')
  const params = useSearchParams()
  const router = useRouter()
  const invited = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const [name, setName] = useState('')
  const [code, setCode] = useState(invited)
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState<{ form: 'create' | 'join'; code: GroupError } | null>(null)

  async function create() {
    if (!name.trim()) return
    setBusy('create'); setError(null)
    const { error: e } = await createGroup(createClient(), name.trim())
    setBusy(null)
    if (e) { setError({ form: 'create', code: e }); return }
    await onDone()
  }

  async function join() {
    if (code.length !== 6) return
    setBusy('join'); setError(null)
    const { error: e } = await joinGroup(createClient(), code)
    setBusy(null)
    if (e) { setError({ form: 'join', code: e }); return }
    router.replace('/community')
    await onDone()
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      transition={{ staggerChildren: 0.05 }}
      className="mx-auto grid max-w-6xl grid-flow-dense grid-cols-12 gap-3 md:gap-4"
    >
      {/* Hero */}
      <motion.section
        variants={card}
        className="relative col-span-12 overflow-hidden rounded-3xl p-6 text-white shadow-[0_10px_30px_rgba(255,128,82,0.25)] md:p-8 lg:col-span-7 lg:row-span-2"
        style={{ background: 'linear-gradient(140deg, #ff8052 0%, #f45d48 45%, #e11d48 100%)' }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex h-full flex-col gap-8 lg:justify-between">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-sm">
              <Users size={12} /> {t('title')}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">{t('hero_title')}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-white/85">{t('hero_text')}</p>
          </div>
          <HeroIllustration />
          <ul className="flex flex-wrap gap-2 text-sm font-semibold">
            {[
              { icon: Flame, label: t('hero_point_1') },
              { icon: Target, label: t('hero_point_2') },
              { icon: Sparkles, label: t('hero_point_3') },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm"><Icon size={14} /> {label}</li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Join (first when arriving with an invite) */}
      <motion.section variants={card} className={cn(SURFACE, 'col-span-12 flex flex-col gap-4 p-5 md:p-6 lg:col-span-5', invited && 'ring-2 ring-primary/40')}>
        <CardHead icon={KeyRound} tone="indigo" title={t('join_title')} text={invited ? t('invited_banner') : t('join_text')} />
        <CodeInput value={code} onChange={setCode} onSubmit={join} />
        {error?.form === 'join' && <ErrorLine code={error.code} />}
        <button
          type="button"
          onClick={join}
          disabled={code.length !== 6 || busy !== null}
          className="h-12 rounded-2xl bg-slate-900 font-bold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {busy === 'join' ? '…' : t('join_button')}
        </button>
      </motion.section>

      {/* Create */}
      <motion.section variants={card} className={cn(SURFACE, 'col-span-12 flex flex-col gap-4 p-5 md:p-6 lg:col-span-5')}>
        <CardHead icon={UserPlus} tone="primary" title={t('create_title')} text={t('create_text')} />
        <form onSubmit={e => { e.preventDefault(); create() }} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={e => setName(e.target.value.slice(0, 40))}
            placeholder={t('create_placeholder')}
            className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-black/[0.06] bg-slate-50 px-4 font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
          />
          <button
            type="submit"
            disabled={!name.trim() || busy !== null}
            className="h-12 shrink-0 rounded-2xl bg-primary px-5 font-bold text-white shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-40"
          >
            {busy === 'create' ? '…' : t('create_button')}
          </button>
        </form>
        {error?.form === 'create' && <ErrorLine code={error.code} />}
        <p className="text-xs text-slate-400">{t('max_members', { n: GROUP_MAX_MEMBERS })}</p>
      </motion.section>

      {/* How it works */}
      <motion.section variants={card} className={cn(SURFACE, 'col-span-12 p-5 md:col-span-7 md:p-6')}>
        <p className={LABEL}>{t('how_title')}</p>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[t('how_1'), t('how_2'), t('how_3', { per: WEEKLY_XP_PER_MEMBER })].map((step, i) => (
            <li key={i} className="flex gap-3 sm:flex-col">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{i + 1}</span>
              <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step}</span>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* Privacy */}
      <motion.section variants={card} className={cn(SURFACE, 'col-span-12 p-5 md:col-span-5 md:p-6')}>
        <p className={cn(LABEL, 'flex items-center gap-1.5')}><ShieldCheck size={13} className="text-emerald-500" /> {t('privacy_title')}</p>
        <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed">
          <li className="flex gap-2.5 text-slate-600 dark:text-slate-300"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {t('privacy_sees')}</li>
          <li className="flex gap-2.5 text-slate-600 dark:text-slate-300"><X size={16} className="mt-0.5 shrink-0 text-slate-400" /> {t('privacy_never')}</li>
        </ul>
      </motion.section>
    </motion.div>
  )
}

/** Avatars, a streak and an XP chip floating on the hero */
function HeroIllustration() {
  const people = [
    { initials: 'A', from: '#6366f1', to: '#a855f7' },
    { initials: 'M', from: '#0ea5e9', to: '#22d3ee' },
    { initials: 'S', from: '#f59e0b', to: '#f97316' },
  ]
  return (
    <div aria-hidden className="relative h-28 select-none">
      <div className="absolute left-0 top-4 flex -space-x-3">
        {people.map((p, i) => (
          <motion.span
            key={p.initials}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
            className="flex size-16 items-center justify-center rounded-full border-4 border-white/30 text-xl font-black shadow-xl"
            style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
          >
            {p.initials}
          </motion.span>
        ))}
      </div>
      <motion.span
        animate={{ y: [0, -6, 0], rotate: [-4, -2, -4] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[11.5rem] top-0 flex items-center gap-1 rounded-2xl bg-white px-3 py-2 text-sm font-black text-orange-500 shadow-xl"
      >
        <Flame size={16} fill="currentColor" /> 12
      </motion.span>
      <motion.span
        animate={{ y: [0, 5, 0], rotate: [3, 5, 3] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        className="absolute left-[14.5rem] top-14 rounded-2xl bg-white px-3 py-2 text-sm font-black text-primary shadow-xl"
      >
        +150 XP
      </motion.span>
      <motion.span
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute left-[19.5rem] top-3 hidden items-center gap-1 rounded-2xl bg-white/95 px-3 py-2 text-sm font-bold text-slate-700 shadow-xl sm:flex"
      >
        <Trophy size={15} className="text-amber-500" /> #1
      </motion.span>
    </div>
  )
}

function CodeInput({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <label className="relative block cursor-text" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label="Code"
        className="peer absolute inset-0 opacity-0"
      />
      <span className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'flex h-14 items-center justify-center rounded-xl border-2 bg-slate-50 text-2xl font-black text-slate-900 transition-colors dark:bg-white/[0.04] dark:text-white',
              i === value.length ? 'border-indigo-500 peer-focus:border-indigo-500' : 'border-black/[0.06] dark:border-white/[0.08]',
              value[i] && 'border-indigo-500/40 bg-indigo-500/[0.05]',
            )}
          >
            {value[i] ?? ''}
          </span>
        ))}
      </span>
    </label>
  )
}

function CardHead({ icon: Icon, tone, title, text }: { icon: React.ElementType; tone: 'primary' | 'indigo'; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-indigo-500/10 text-indigo-500')}>
        <Icon size={20} />
      </span>
      <div>
        <h2 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  )
}

function ErrorLine({ code }: { code: GroupError }) {
  const t = useTranslations('community')
  return <p className="text-sm font-semibold text-red-500">{t(`err_${code}`)}</p>
}

// ── In a group ────────────────────────────────────────────────────────────────

function GroupView({ group, feed, onChange }: { group: StudyGroup; feed: FeedEvent[]; onChange: () => Promise<void> }) {
  const t = useTranslations('community')
  const me = group.members.find(m => m.is_me)
  const isOwner = me?.role === 'owner'
  const [confirm, setConfirm] = useState<{ kind: 'leave' } | { kind: 'remove'; member: GroupMember } | null>(null)
  const [busy, setBusy] = useState(false)

  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    const supabase = createClient()
    const { error } = confirm.kind === 'leave' ? await leaveGroup(supabase) : await removeMember(supabase, confirm.member.user_id)
    setBusy(false)
    setConfirm(null)
    if (error) toast.error(t(`err_${error}`))
    await onChange()
  }

  return (
    <>
      <motion.div
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.05 }}
        className="mx-auto grid max-w-6xl grid-flow-dense grid-cols-12 gap-3 md:gap-4"
      >
        <GroupHeader group={group} isOwner={isOwner} onChange={onChange} />
        <WeeklyGoal group={group} />
        <Ranking members={group.members} />
        <Feed events={feed} members={group.members} />
        <motion.section variants={card} className="col-span-12">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <p className={LABEL}>{t('members_title')}</p>
            <p className="text-xs font-semibold text-slate-400">{group.members.length}/{GROUP_MAX_MEMBERS}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.members.map(m => (
              <MemberCard key={m.user_id} member={m} canRemove={isOwner && !m.is_me} onRemove={() => setConfirm({ kind: 'remove', member: m })} />
            ))}
          </div>
        </motion.section>
        <motion.div variants={card} className="col-span-12 flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'leave' })}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut size={15} /> {t('leave')}
          </button>
        </motion.div>
      </motion.div>

      <Dialog open={confirm !== null} onOpenChange={o => { if (!o) setConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === 'remove' ? t('remove_confirm_title', { name: confirm.member.name }) : t('leave_confirm_title', { name: group.name })}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === 'remove' ? t('remove_confirm_text') : isOwner && group.members.length > 1 ? t('leave_confirm_text_owner') : t('leave_confirm_text')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 flex-1 rounded-xl border border-black/[0.08] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.1] dark:text-slate-300 dark:hover:bg-white/[0.04]">
              {t('cancel')}
            </button>
            <button type="button" onClick={runConfirm} disabled={busy} className="h-11 flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 disabled:opacity-50">
              {confirm?.kind === 'remove' ? t('remove') : t('leave')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function GroupHeader({ group, isOwner, onChange }: { group: StudyGroup; isOwner: boolean; onChange: () => Promise<void> }) {
  const t = useTranslations('community')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)
  const [copied, setCopied] = useState(false)

  async function saveName() {
    if (!name.trim() || name.trim() === group.name) { setEditing(false); return }
    const { error } = await renameGroup(createClient(), name.trim())
    if (error) toast.error(t(`err_${error}`))
    setEditing(false)
    await onChange()
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error(t('err_unknown'))
    }
  }

  async function share() {
    const url = inviteLink(group.invite_code)
    const text = t('share_text', { code: group.invite_code })
    if (navigator.share) {
      try { await navigator.share({ title: group.name, text, url }) } catch { /* cancelled */ }
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    toast.success(t('link_copied'))
  }

  async function regenerate() {
    const { error } = await newInviteCode(createClient())
    if (error) toast.error(t(`err_${error}`))
    else toast.success(t('new_code_done'))
    await onChange()
  }

  return (
    <motion.section
      variants={card}
      className="relative col-span-12 overflow-hidden rounded-3xl p-6 text-white shadow-[0_10px_30px_rgba(255,128,82,0.22)] md:p-7 lg:col-span-8"
      style={{ background: 'linear-gradient(140deg, #ff8052 0%, #f45d48 50%, #e11d48 100%)' }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-sm">
              <Users size={12} /> {t('members_count', { n: group.members.length })}
            </span>
            {editing ? (
              <form onSubmit={e => { e.preventDefault(); saveName() }} className="mt-3 flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 40))}
                  className="h-11 min-w-0 rounded-xl bg-white/20 px-3 text-2xl font-bold text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                />
                <button type="submit" aria-label={t('save')} className="flex size-11 items-center justify-center rounded-xl bg-white text-primary"><Check size={18} /></button>
                <button type="button" aria-label={t('cancel')} onClick={() => { setName(group.name); setEditing(false) }} className="flex size-11 items-center justify-center rounded-xl bg-white/15"><X size={18} /></button>
              </form>
            ) : (
              <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold leading-tight md:text-4xl">
                <span className="truncate">{group.name}</span>
                {isOwner && (
                  <button type="button" aria-label={t('rename')} onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white">
                    <Pencil size={16} />
                  </button>
                )}
              </h1>
            )}
          </div>
          <AvatarStack members={group.members} />
        </div>

        {/* Invite */}
        <div className="flex flex-col gap-3 rounded-2xl bg-black/15 p-4 backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/70">{t('invite_title')}</p>
            <div className="mt-1.5 flex gap-1">
              {group.invite_code.split('').map((ch, i) => (
                <span key={i} className="flex h-10 w-8 items-center justify-center rounded-lg bg-white/90 text-xl font-black text-slate-900">{ch}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyCode} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm font-bold transition-colors hover:bg-white/25">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t('copied') : t('copy_code')}
            </button>
            <button type="button" onClick={share} className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-primary shadow-md transition hover:opacity-95">
              <Share2 size={15} /> {t('share_link')}
            </button>
            {isOwner && (
              <button type="button" onClick={regenerate} title={t('new_code_hint')} aria-label={t('new_code')} className="flex size-10 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/25">
                <RefreshCw size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function WeeklyGoal({ group }: { group: StudyGroup }) {
  const t = useTranslations('community')
  const locale = useLocale()
  const { goal, done } = weeklyGoal(group)
  const pct = Math.min(done / goal, 1)
  const reached = done >= goal
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <motion.section variants={card} className={cn(SURFACE, 'col-span-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-center lg:col-span-4 lg:flex-col lg:items-stretch')}>
      <div className="flex items-baseline justify-between gap-2 sm:hidden lg:flex">
        <p className={LABEL}>{t('goal_title')}</p>
        <p className="text-xs font-semibold text-slate-400">{t('days_left', { n: daysLeftInWeek() })}</p>
      </div>
      <div className="relative mx-auto size-36 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
            stroke={reached ? '#10b981' : 'url(#goal-gradient)'}
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="goal-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8052" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          {reached ? <Trophy size={22} className="text-emerald-500" /> : <Target size={20} className="text-primary" />}
          <span className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-white">{Math.round(pct * 100)}%</span>
        </span>
      </div>
      <div className="text-center sm:text-left lg:text-center">
        <p className={cn(LABEL, 'hidden sm:block lg:hidden')}>{t('goal_title')}</p>
        <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
          {done.toLocaleString(locale)} <span className="text-slate-400">/ {goal.toLocaleString(locale)} XP</span>
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {reached ? t('goal_done') : t('goal_text', { per: WEEKLY_XP_PER_MEMBER })}
        </p>
        <p className="mt-1 hidden text-xs font-semibold text-slate-400 sm:block lg:hidden">{t('days_left', { n: daysLeftInWeek() })}</p>
      </div>
    </motion.section>
  )
}

function Ranking({ members }: { members: GroupMember[] }) {
  const t = useTranslations('community')
  const ranked = useMemo(() => [...members].sort((a, b) => b.week_xp - a.week_xp || b.total_xp - a.total_xp), [members])
  const anyXp = ranked.some(m => m.week_xp > 0)
  const podium = ranked.slice(0, 3)
  // Visual order: 2nd, 1st, 3rd
  const order = [podium[1], podium[0], podium[2]].filter(Boolean) as GroupMember[]
  // By place: gold, silver, bronze
  const HEIGHT = ['h-32', 'h-24', 'h-16']
  const MEDAL = ['#fbbf24', '#cbd5e1', '#d97706']

  return (
    <motion.section variants={card} className={cn(SURFACE, 'col-span-12 flex flex-col p-5 md:p-6 lg:col-span-7')}>
      <div className="flex items-baseline justify-between">
        <p className={cn(LABEL, 'flex items-center gap-1.5')}><Trophy size={13} className="text-amber-500" /> {t('ranking_title')}</p>
        <p className="text-xs font-semibold text-slate-400">{t('days_left', { n: daysLeftInWeek() })}</p>
      </div>

      {!anyXp && <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">{t('ranking_empty')}</p>}

      {/* Podium */}
      <div className="mt-5 flex items-end justify-center gap-2 sm:gap-4">
        {order.map(m => {
          const place = podium.indexOf(m)
          return (
            <div key={m.user_id} className="flex w-24 flex-col items-center gap-2 sm:w-28">
              <div className="relative">
                {place === 0 && <Crown size={20} className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-400" fill="currentColor" />}
                <Avatar member={m} className={cn(place === 0 ? 'size-16 text-xl' : 'size-12 text-base', 'ring-4')} ringColor={MEDAL[place]} />
              </div>
              <p className="max-w-full truncate text-sm font-bold text-slate-900 dark:text-white">{m.is_me ? t('you') : m.name}</p>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className={cn('flex w-full flex-col items-center justify-start rounded-t-2xl pt-2', HEIGHT[place])}
                style={{ background: `linear-gradient(180deg, ${MEDAL[place]}55, ${MEDAL[place]}11)` }}
              >
                <span className="text-xl font-black text-slate-700 dark:text-slate-200">{place + 1}</span>
                <span className="text-[11px] font-bold tabular-nums text-primary">+{m.week_xp} XP</span>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* The rest */}
      {ranked.length > 3 && (
        <ol className="mt-4 divide-y divide-black/[0.04] border-t border-black/[0.04] dark:divide-white/[0.05] dark:border-white/[0.05]">
          {ranked.slice(3).map((m, i) => (
            <li key={m.user_id} className={cn('flex items-center gap-3 px-1 py-2.5', m.is_me && 'rounded-xl bg-primary/[0.06]')}>
              <span className="w-6 text-center text-sm font-black tabular-nums text-slate-400">{i + 4}</span>
              <Avatar member={m} className="size-8 text-xs" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{m.is_me ? t('you') : m.name}</span>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-primary">+{m.week_xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </motion.section>
  )
}

function Feed({ events, members }: { events: FeedEvent[]; members: GroupMember[] }) {
  const t = useTranslations('community')
  const locale = useLocale()
  const { translationLang } = useActiveLanguage()
  const [grammarTitles, setGrammarTitles] = useState<Record<string, string>>({})
  const byId = new Map(members.map(m => [m.user_id, m]))

  useEffect(() => {
    if (!events.some(e => e.kind === 'grammar_module')) return
    loadGrammarIndex('fr', explanationLanguage(translationLang, null)).then(idx => {
      if (idx) setGrammarTitles(Object.fromEntries(idx.modules.map(m => [m.slug, m.title])))
    })
  }, [events, translationLang])

  const ago = useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    return (iso: string) => {
      const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
      if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
      const hours = Math.round(mins / 60)
      if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
      return rtf.format(Math.round(hours / 24), 'day')
    }
  }, [locale])

  return (
    <motion.section variants={card} className={cn(SURFACE, 'col-span-12 flex flex-col p-5 md:p-6 lg:col-span-5')}>
      <p className={cn(LABEL, 'flex items-center gap-1.5')}><Sparkles size={13} className="text-primary" /> {t('feed_title')}</p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('feed_empty')}</p>
      ) : (
        <ol className="relative mt-4 flex max-h-[22rem] flex-col gap-4 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {events.map((e, i) => {
            const m = byId.get(e.user_id)
            if (!m) return null
            const who = m.is_me ? t('you') : m.name
            const Icon = e.kind === 'lesson' ? BookOpen : e.kind === 'grammar_module' ? GraduationCap : UserPlus
            const tone = e.kind === 'lesson' ? 'bg-primary text-white' : e.kind === 'grammar_module' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
            return (
              <li key={`${e.user_id}-${e.at}-${i}`} className="flex gap-3">
                <span className="relative shrink-0">
                  <Avatar member={m} className="size-9 text-xs" />
                  <span className={cn('absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#202638]', tone)}>
                    <Icon size={10} />
                  </span>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">{who}</span>{' '}
                    {e.kind === 'lesson' && t('feed_lesson', { module: e.data.module_title })}
                    {e.kind === 'grammar_module' && t('feed_grammar', { module: grammarTitles[e.data.module_slug] ?? e.data.module_slug })}
                    {e.kind === 'joined' && t('feed_joined')}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    {ago(e.at)}
                    {e.kind === 'lesson' && (
                      <>
                        <span>·</span>
                        {t('feed_activities', { n: e.data.activities })}
                        {e.data.stars ? <span className="text-amber-400">{'★'.repeat(e.data.stars)}</span> : null}
                      </>
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </motion.section>
  )
}

function MemberCard({ member: m, canRemove, onRemove }: { member: GroupMember; canRemove: boolean; onRemove: () => void }) {
  const t = useTranslations('community')
  const [menu, setMenu] = useState(false)
  const lang = m.language_code ? getLanguage(m.language_code) : null
  const max = Math.max(...m.days, 1)
  const locale = useLocale()
  // Weekday initials of the last 7 days, today last
  const [dayLabels] = useState(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
    const today = Date.now()
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(today - (6 - i) * 86400000)))
  })

  return (
    <div className={cn(SURFACE, 'relative flex flex-col gap-4 p-5', m.is_me && 'ring-2 ring-primary/30')}>
      <div className="flex items-start gap-3">
        <span className="relative">
          <Avatar member={m} className="size-12 text-base" />
          <span
            title={m.active_today ? t('active_today') : t('not_active_today')}
            className={cn('absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-white dark:ring-[#202638]', m.active_today ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-bold text-slate-900 dark:text-white">
            {m.name}
            {m.is_me && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{t('you')}</span>}
            {m.role === 'owner' && <Crown size={13} className="shrink-0 text-amber-400" fill="currentColor" aria-label={t('owner')} />}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {lang && <span>{lang.flag} {lang.name}</span>}
          </p>
        </div>
        {canRemove && (
          <div className="relative">
            <button type="button" aria-label={t('remove')} onClick={() => setMenu(v => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06]">
              <MoreHorizontal size={16} />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-9 z-10 w-48 rounded-xl border border-black/[0.06] bg-white p-1 shadow-xl dark:border-white/[0.08] dark:bg-[#2a3148]"
                >
                  <button
                    type="button"
                    onClick={() => { setMenu(false); onRemove() }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-500/10"
                  >
                    <UserMinus size={15} /> {t('remove')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={<Flame size={14} className="text-orange-500" fill="currentColor" />} value={String(m.streak)} label={t('streak')} />
        <MiniStat icon={<Zap size={14} className="text-primary" />} value={m.week_xp.toLocaleString(locale)} label={t('week_xp')} />
        <MiniStat icon={<Sparkles size={14} className="text-indigo-500" />} value={m.total_xp.toLocaleString(locale)} label={t('total_xp')} />
      </div>

      {/* Last 7 days */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('last_7_days')}</p>
        <div className="flex h-12 items-end gap-1.5">
          {m.days.map((xp, i) => (
            <div key={i} className="flex h-full flex-1 flex-col justify-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((xp / max) * 100, xp > 0 ? 12 : 6)}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                title={`${xp} XP`}
                className={cn('w-full rounded-md', xp > 0 ? (i === 6 ? 'bg-primary' : 'bg-primary/45') : 'bg-black/[0.06] dark:bg-white/[0.08]')}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1.5">
          {dayLabels.map((d, i) => <span key={i} className={cn('flex-1 text-center text-[10px] font-semibold', i === 6 ? 'text-primary' : 'text-slate-400')}>{d}</span>)}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-slate-50 py-2.5 dark:bg-white/[0.04]">
      {icon}
      <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  )
}

function AvatarStack({ members }: { members: GroupMember[] }) {
  const shown = members.slice(0, 5)
  return (
    <div className="flex -space-x-2.5">
      {shown.map(m => <Avatar key={m.user_id} member={m} className="size-11 text-sm ring-[3px] ring-white/40" />)}
      {members.length > shown.length && (
        <span className="flex size-11 items-center justify-center rounded-full bg-white/20 text-sm font-bold ring-[3px] ring-white/40">+{members.length - shown.length}</span>
      )}
    </div>
  )
}

const AVATAR_GRADIENTS = [
  ['#6366f1', '#a855f7'], ['#0ea5e9', '#22d3ee'], ['#f59e0b', '#f97316'], ['#10b981', '#14b8a6'],
  ['#ec4899', '#f43f5e'], ['#8b5cf6', '#6366f1'], ['#ff8052', '#e11d48'], ['#0891b2', '#2563eb'],
]

function Avatar({ member, className, ringColor }: { member: GroupMember; className?: string; ringColor?: string }) {
  const style = ringColor ? ({ '--tw-ring-color': ringColor } as React.CSSProperties) : undefined
  if (member.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google avatar, no next/image domain config needed
      <img src={member.avatar_url} alt="" referrerPolicy="no-referrer" style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
    )
  }
  const hash = [...member.user_id].reduce((n, ch) => n + ch.charCodeAt(0), 0)
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full font-black text-white', className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})`, ...style }}
    >
      {member.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
