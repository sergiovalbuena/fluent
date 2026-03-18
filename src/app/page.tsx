import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const CountUpStats = dynamic(() => import('@/components/landing/stats').then(m => ({ default: m.CountUpStats })))
const Features = dynamic(() => import('@/components/landing/features').then(m => ({ default: m.Features })))
const HowItWorks = dynamic(() => import('@/components/landing/how-it-works').then(m => ({ default: m.HowItWorks })))

const languages = [
  { flag: '🇪🇸', name: 'Spanish', available: true },
  { flag: '🇫🇷', name: 'French', available: true },
  { flag: '🇧🇷', name: 'Portuguese', available: true },
  { flag: '🇩🇪', name: 'German', available: false },
  { flag: '🇮🇹', name: 'Italian', available: false },
  { flag: '🇯🇵', name: 'Japanese', available: false },
  { flag: '🇨🇳', name: 'Chinese', available: false },
  { flag: '🇺🇸', name: 'English', available: true },
]



export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#23140f] text-slate-900 dark:text-slate-100 font-display">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#23140f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="text-lg font-bold tracking-tight">Fluent</span>
          </Link>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">Features</a>
            <a href="#languages" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">Languages</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">How it works</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link href="/dashboard">
              <button className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-20 md:pt-28 pb-16 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                🌍 Language Learning Reimagined
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                Learn any language,{' '}
                <span className="text-primary">one lesson</span>{' '}
                at a time.
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                Fluent makes language learning effective and enjoyable. Structured modules,
                interactive quizzes, flashcards, and real stories — all in 10 minutes a day.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/dashboard">
                  <button className="w-full sm:w-auto bg-primary text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 text-base">
                    Start for free →
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-8 py-4 rounded-xl border border-primary/10 hover:border-primary/30 transition-all text-base">
                    See how it works
                  </button>
                </a>
              </div>
              {/* Social proof */}
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                No credit card required · Available on all devices
              </p>
            </div>

            {/* Right: App preview cards */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-72">
                {/* Phone frame */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border-4 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                  {/* Mock header */}
                  <div className="bg-[#f8f6f5] dark:bg-[#23140f] px-5 py-4 flex items-center justify-between border-b border-primary/10">
                    <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">F</div>
                    <span className="font-bold">Fluent</span>
                    <div className="bg-primary/10 px-2.5 py-1 rounded-full text-primary text-[10px] font-bold">7 🔥</div>
                  </div>
                  {/* Mock module card */}
                  <div className="bg-[#f8f6f5] dark:bg-[#23140f] p-4 space-y-3">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                      <div className="bg-primary/10 h-28 flex items-center justify-center text-5xl">🏠</div>
                      <div className="p-4 space-y-2">
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Current Module</p>
                        <p className="font-bold">Family &amp; Home</p>
                        <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full w-[65%]" />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Module Progress</span>
                          <span className="text-primary font-bold">65%</span>
                        </div>
                      </div>
                    </div>
                    {/* Mini lesson cards */}
                    {[
                      { emoji: '🍽️', label: 'Food & Drink', pct: 60 },
                      { emoji: '✈️', label: 'Travel', pct: 16 },
                    ].map(item => (
                      <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl flex items-center gap-3 p-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">{item.emoji}</div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{item.label}</p>
                          <div className="h-1.5 bg-primary/10 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-primary">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -right-8 top-1/4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-primary/10 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-primary">245</p>
                  <p className="text-[10px] text-slate-400 font-medium">Words learned</p>
                </div>
                <div className="absolute -left-8 bottom-1/4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-primary/10 px-4 py-3 text-center">
                  <p className="text-2xl">🔥</p>
                  <p className="text-xs font-bold text-primary">12 day streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <Suspense fallback={null}>
        <CountUpStats />
      </Suspense>

      {/* ── FEATURES ── */}
      <Suspense fallback={null}>
        <Features />
      </Suspense>

      {/* ── LANGUAGES ── */}
      <section id="languages" className="py-20 md:py-28 bg-white/50 dark:bg-slate-800/20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Growing catalog</p>
            <h2 className="text-3xl md:text-4xl font-bold">Choose your language</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">
              Start with Spanish, French, or Portuguese today. More languages launching soon.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {languages.map(lang => (
              <div
                key={lang.name}
                className={`relative bg-white dark:bg-slate-800 rounded-2xl p-5 border text-center transition-all ${
                  lang.available
                    ? 'border-primary/10 hover:border-primary/30 hover:shadow-md cursor-pointer'
                    : 'border-slate-100 dark:border-slate-700 opacity-50'
                }`}
              >
                <div className="text-4xl mb-3">{lang.flag}</div>
                <p className="font-bold text-sm">{lang.name}</p>
                {lang.available ? (
                  <span className="inline-block mt-2 text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Available
                  </span>
                ) : (
                  <span className="inline-block mt-2 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Coming soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <Suspense fallback={null}>
        <HowItWorks />
      </Suspense>

      {/* ── CTA BANNER ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to become fluent?</h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                Join thousands of learners. Start your first lesson in under a minute.
              </p>
              <Link href="/dashboard">
                <button className="bg-white text-primary font-bold px-10 py-4 rounded-xl text-base hover:bg-white/90 transition-all active:scale-95 shadow-xl">
                  Start for free →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-primary/10 py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">F</div>
            <span className="font-bold">Fluent</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 Fluent. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-slate-400 hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-xs text-slate-400 hover:text-primary transition-colors">Terms</a>
            <Link href="/login" className="text-xs text-slate-400 hover:text-primary transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
