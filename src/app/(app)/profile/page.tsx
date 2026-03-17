'use client'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import {
  Bell,
  BookOpen,
  ChevronRight,
  Globe,
  HelpCircle,
  LogIn,
  Moon,
  Shield,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'

const languages = [
  { flag: '🇪🇸', name: 'Spanish', level: 'Beginner', xp: 0, active: true },
  { flag: '🇫🇷', name: 'French', level: 'Not started', xp: 0, active: false },
  { flag: '🇧🇷', name: 'Portuguese', level: 'Not started', xp: 0, active: false },
]

const achievements = [
  { icon: '🔥', label: 'First Streak', earned: false },
  { icon: '🗂️', label: '10 Words', earned: false },
  { icon: '⭐', label: '100 XP', earned: false },
  { icon: '📖', label: 'First Story', earned: false },
  { icon: '🏆', label: 'Top Learner', earned: false },
  { icon: '💬', label: '10 Phrases', earned: false },
]

type SettingItem = {
  icon: React.ElementType
  label: string
  value?: string
  href?: string
  danger?: boolean
}

const settingsSections: { title: string; items: SettingItem[] }[] = [
  {
    title: 'Account',
    items: [
      { icon: Globe, label: 'App Language', value: 'English' },
      { icon: Bell, label: 'Notifications', value: 'Off' },
      { icon: Moon, label: 'Theme', value: 'System' },
    ],
  },
  {
    title: 'Learning',
    items: [
      { icon: BookOpen, label: 'Daily Goal', value: '10 min' },
      { icon: Zap, label: 'Reminder Time', value: '8:00 AM' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', href: '#' },
      { icon: Shield, label: 'Privacy Policy', href: '#' },
    ],
  },
]

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center px-4 md:px-8 py-4 md:py-5 justify-between sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── Hero card ── */}
          <div className="relative bg-primary rounded-3xl p-6 text-white overflow-hidden">
            {/* Background circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-white/30 shrink-0">
                <AvatarFallback className="bg-white/20 text-white font-bold text-2xl">
                  TU
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold leading-tight">Test User</h2>
                <p className="text-sm text-white/70">Joined March 2026</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">🌱 Beginner</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">0 🔥</span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                { value: '0', label: 'Day Streak' },
                { value: '0', label: 'Total XP' },
                { value: '0', label: 'Words' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-2xl py-3">
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[10px] text-white/70 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sign in CTA ── */}
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

          {/* ── My Languages ── */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">My Languages</h3>
            <div className="space-y-2">
              {languages.map(lang => (
                <div
                  key={lang.name}
                  className="flex items-center gap-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-4 hover:border-primary/20 transition-all"
                >
                  <span className="text-2xl shrink-0">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{lang.name}</p>
                    <p className="text-xs text-muted-foreground">{lang.level}</p>
                  </div>
                  {lang.active ? (
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                      Active
                    </span>
                  ) : (
                    <button className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-400 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 hover:bg-primary/10 hover:text-primary transition-colors">
                      Unlock
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

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
              <p className="text-xs text-muted-foreground">Sign in to compete with other learners</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
              <Star size={12} />
              Soon
            </div>
          </div>

          {/* ── Settings ── */}
          {settingsSections.map(section => (
            <section key={section.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">{section.title}</h3>
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
                {section.items.map(item => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors cursor-pointer ${item.danger ? 'text-red-500' : ''}`}
                  >
                    <item.icon size={16} className={item.danger ? 'text-red-500' : 'text-muted-foreground'} />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.value && (
                      <span className="text-xs text-muted-foreground font-medium">{item.value}</span>
                    )}
                    <ChevronRight size={14} className="text-muted-foreground/50" />
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* ── App version ── */}
          <p className="text-center text-xs text-muted-foreground pb-4">
            Fluent v1.0.0 · Made with ❤️
          </p>

        </div>
      </main>
    </div>
  )
}
