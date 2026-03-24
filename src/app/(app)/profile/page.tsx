'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Globe,
  HelpCircle,
  LogIn,
  Monitor,
  Moon,
  Settings2,
  Shield,
  Star,
  Sun,
  Trophy,
  Zap,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────

const APP_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
]

const DAILY_GOALS = [
  { value: 5,  label: '5 min',  desc: 'Casual 🌱' },
  { value: 10, label: '10 min', desc: 'Regular 🔥' },
  { value: 20, label: '20 min', desc: 'Intensive ⚡' },
]

const REMINDER_TIMES = [
  '7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
]

const achievements = [
  { icon: '🔥', label: 'First Streak', earned: false },
  { icon: '🗂️', label: '10 Words',     earned: false },
  { icon: '⭐', label: '100 XP',       earned: false },
  { icon: '📖', label: 'First Story',  earned: false },
  { icon: '🏆', label: 'Top Learner',  earned: false },
  { icon: '💬', label: '10 Phrases',   earned: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────────


function initials(name: string | null) {
  if (!name) return 'FL'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function joinedDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
    .format(new Date(iso))
}

// ── Row helper ────────────────────────────────────────────────────────────────

function RowInner({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value?: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors w-full">
      <Icon size={16} className="text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {value && <span className="text-xs text-muted-foreground font-medium">{value}</span>}
      <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Auth + profile
  const [userId, setUserId]   = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Settings state (initialised from DB once loaded)
  const [appLang, setAppLang]             = useState({ code: 'en', name: 'English', flag: '🇬🇧' })
  const [langSheetOpen, setLangSheetOpen] = useState(false)
  const [notifications, setNotifications] = useState('Off')
  const [dailyGoal, setDailyGoal]         = useState(10)
  const [reminderTime, setReminderTime]   = useState('8:00 AM')

  // ── Load user + profile on mount ────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return
          setProfile(data as UserProfile)

          // Hydrate settings from DB
          const lang = APP_LANGUAGES.find(l => l.code === data.app_language_code)
          if (lang) setAppLang(lang)
          setNotifications(data.notification_preference ?? 'Off')
          setDailyGoal(data.daily_goal_minutes ?? 10)
          setReminderTime(data.reminder_time ?? '8:00 AM')
        })
    })
  }, [])

  // ── Persist a single setting to DB ──────────────────────────────────────────
  async function saveSetting(field: string, value: string | number) {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('user_profiles')
      .update({ [field]: value })
      .eq('user_id', userId)
  }

  // ── Derived display values ───────────────────────────────────────────────────
  const currentThemeLabel  = !mounted ? 'System' : theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'
  const currentGoalLabel   = DAILY_GOALS.find(g => g.value === dailyGoal)?.label ?? '10 min'
  const displayName        = profile?.display_name ?? 'Learner'
  const streakCount        = profile?.streak_count ?? 0
  const totalXp            = profile?.total_xp ?? 0
  const isLoggedIn         = !!userId

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <header className="flex items-center px-4 md:px-8 py-4 md:py-5 sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── Hero card ── */}
          <div className="relative bg-primary rounded-3xl p-6 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-white/30 shrink-0">
                <AvatarFallback className="bg-white/20 text-white font-bold text-2xl">
                  {initials(profile?.display_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold leading-tight">{displayName}</h2>
                <p className="text-sm text-white/70">
                  {profile ? `Joined ${joinedDate(profile.created_at)}` : 'Not signed in'}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {streakCount} 🔥
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {totalXp} XP ⚡
                  </span>
                </div>
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-3 text-center">
              {[
                { value: String(streakCount), label: 'Day Streak' },
                { value: String(totalXp),     label: 'Total XP'   },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-2xl py-3">
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[10px] text-white/70 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sign in CTA — only when not logged in ── */}
          {!isLoggedIn && (
            <Link href="/login">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/10 p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <LogIn size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Sign in to save progress</p>
                  <p className="text-xs text-muted-foreground">Sync your streak, XP and lessons across devices</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          )}

          {/* ── Achievements ── */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Achievements</h3>
              <span className="text-xs text-muted-foreground">0 / {achievements.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {achievements.map(a => (
                  <div
                    key={a.label}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                      a.earned
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-slate-50 dark:bg-slate-800 opacity-40 grayscale'
                    }`}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-[10px] font-bold text-center leading-tight">{a.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Complete lessons to unlock achievements
              </p>
            </div>
          </section>

          {/* ── Leaderboard teaser ── */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-4">
            <div className="size-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Trophy size={18} className="text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Leaderboard</p>
              <p className="text-xs text-muted-foreground">Compete with other learners worldwide</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
              <Star size={12} />
              Soon
            </div>
          </div>

          {/* ── Profile Setup ── */}
          <Link href="/onboarding">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/20 p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Settings2 size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Profile Setup</p>
                <p className="text-xs text-muted-foreground">Redo your language & learning preferences</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>

          {/* ── Account ── */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Account</h3>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">

              {/* App Language */}
              <Sheet open={langSheetOpen} onOpenChange={setLangSheetOpen}>
                <button className="w-full text-left cursor-pointer" onClick={() => setLangSheetOpen(true)}>
                  <RowInner icon={Globe} label="App Language" value={`${appLang.flag} ${appLang.name}`} />
                </button>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] flex flex-col">
                  <SheetHeader className="px-6 pt-2 pb-2">
                    <SheetTitle className="text-base font-bold">App Language</SheetTitle>
                    <p className="text-xs text-muted-foreground">Choose the language for the app interface</p>
                  </SheetHeader>
                  <div className="overflow-y-auto px-4 pb-8 space-y-2 flex-1">
                    {APP_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                          appLang.code === lang.code
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted/30 hover:border-primary/20 dark:bg-slate-700/30'
                        }`}
                        onClick={() => {
                          setAppLang(lang)
                          void saveSetting('app_language_code', lang.code)
                          setLangSheetOpen(false)
                        }}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="font-medium flex-1 text-left text-sm">{lang.name}</span>
                        {appLang.code === lang.code && (
                          <div className="size-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full text-left cursor-pointer">
                  <RowInner icon={Bell} label="Notifications" value={notifications} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  {['Off', 'Daily', 'Smart'].map(option => (
                    <DropdownMenuItem
                      key={option}
                      className="justify-between"
                      onClick={() => {
                        setNotifications(option)
                        void saveSetting('notification_preference', option)
                      }}
                    >
                      {option}
                      {notifications === option && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full text-left cursor-pointer">
                  <RowInner icon={Moon} label="Theme" value={currentThemeLabel} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  <DropdownMenuItem className="justify-between" onClick={() => setTheme('light')}>
                    <span className="flex items-center gap-2"><Sun size={13} />Light</span>
                    {theme === 'light' && <Check size={13} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="justify-between" onClick={() => setTheme('dark')}>
                    <span className="flex items-center gap-2"><Moon size={13} />Dark</span>
                    {theme === 'dark' && <Check size={13} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="justify-between" onClick={() => setTheme('system')}>
                    <span className="flex items-center gap-2"><Monitor size={13} />System</span>
                    {(theme === 'system' || !theme) && <Check size={13} className="text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </section>

          {/* ── Learning ── */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Learning</h3>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">

              {/* Daily Goal */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full text-left cursor-pointer">
                  <RowInner icon={BookOpen} label="Daily Goal" value={currentGoalLabel} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  {DAILY_GOALS.map(g => (
                    <DropdownMenuItem
                      key={g.value}
                      className="justify-between"
                      onClick={() => {
                        setDailyGoal(g.value)
                        void saveSetting('daily_goal_minutes', g.value)
                      }}
                    >
                      <span>{g.label} <span className="text-muted-foreground text-xs">{g.desc}</span></span>
                      {dailyGoal === g.value && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reminder Time */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full text-left cursor-pointer">
                  <RowInner icon={Clock} label="Reminder Time" value={reminderTime} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  {REMINDER_TIMES.map(time => (
                    <DropdownMenuItem
                      key={time}
                      className="justify-between"
                      onClick={() => {
                        setReminderTime(time)
                        void saveSetting('reminder_time', time)
                      }}
                    >
                      {time}
                      {reminderTime === time && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-muted-foreground justify-between"
                    onClick={() => {
                      setReminderTime('Off')
                      void saveSetting('reminder_time', 'Off')
                    }}
                  >
                    Off
                    {reminderTime === 'Off' && <Check size={13} className="text-primary ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </section>

          {/* ── Support ── */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Support</h3>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
              <Link href="/help-center" className="block">
                <RowInner icon={HelpCircle} label="Help Center" />
              </Link>
              <Link href="/privacy-policy" className="block">
                <RowInner icon={Shield} label="Privacy Policy" />
              </Link>
            </div>
          </section>

          {/* ── XP info when logged in ── */}
          {isLoggedIn && (
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pb-1">
              <Zap size={11} className="text-primary" />
              <span>Settings sync automatically to your account</span>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground pb-4">
            Fluent v1.0.0 · Made with ❤️
          </p>

        </div>
      </main>
    </div>
  )
}
