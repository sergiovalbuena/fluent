import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { LandingHeader } from '@/components/landing/landing-header'

const HeroSection      = dynamic(() => import('@/components/landing/hero-section'))
const CountUpStats     = dynamic(() => import('@/components/landing/stats').then(m => ({ default: m.CountUpStats })))
const FeaturesBento    = dynamic(() => import('@/components/landing/features-bento').then(m => ({ default: m.FeaturesBento })))
const HowItWorks       = dynamic(() => import('@/components/landing/how-it-works').then(m => ({ default: m.HowItWorks })))

// ── Data ─────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { flag: '🇪🇸', name: 'Spanish',    tagline: 'Most popular', available: true  },
  { flag: '🇫🇷', name: 'French',     tagline: '50+ modules',  available: true  },
  { flag: '🇧🇷', name: 'Portuguese', tagline: 'New',           available: true  },
  { flag: '🇩🇪', name: 'German',     tagline: 'Available',     available: true  },
  { flag: '🇮🇹', name: 'Italian',    tagline: 'Available',     available: true  },
  { flag: '🇯🇵', name: 'Japanese',   tagline: 'Available',     available: true  },
  { flag: '🇨🇳', name: 'Chinese',    tagline: 'Coming soon',   available: false },
  { flag: '🇰🇷', name: 'Korean',     tagline: 'Coming soon',   available: false },
]

const TESTIMONIALS = [
  {
    name: 'Sofia R.',    flag: '🇧🇷', role: 'Traveled to Spain',
    text: 'I learned enough Spanish in 2 weeks to order food, ask for directions, and make friends. The survival kit saved me on day one.',
    stars: 5,
  },
  {
    name: 'Thomas K.',   flag: '🇩🇪', role: 'Business traveler',
    text: 'The structured modules and daily streaks kept me consistent. I went from zero to holding basic conversations in French in 3 months.',
    stars: 5,
  },
  {
    name: 'Yuki M.',     flag: '🇯🇵', role: 'Language enthusiast',
    text: 'MarIA, the AI tutor, is a game changer. It corrects my mistakes with context, not just rules. My Portuguese sounds natural now.',
    stars: 5,
  },
  {
    name: 'Ana C.',      flag: '🇲🇽', role: 'Student',
    text: 'I tried Duolingo, Babbel, everything. Fluent is the first app that made me actually remember what I learned. The challenge mode is brilliant.',
    stars: 5,
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#23140f] text-slate-900 dark:text-slate-100 font-display">

      <LandingHeader />

      {/* Hero */}
      <Suspense fallback={<div className="h-[600px]" />}>
        <HeroSection />
      </Suspense>

      {/* Stats */}
      <Suspense fallback={null}>
        <CountUpStats />
      </Suspense>

      {/* Features bento */}
      <Suspense fallback={null}>
        <FeaturesBento />
      </Suspense>

      {/* ── Languages ─────────────────────────────────────────────────────── */}
      <section id="languages" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">6 languages available now</p>
            <h2 className="text-3xl md:text-4xl font-bold">Choose your language</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">
              Spanish, French, Portuguese, German, Italian, and Japanese — all fully available today.
              Chinese and Korean launching soon.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {LANGUAGES.map(lang => (
              <a
                key={lang.name}
                href={lang.available ? '/login' : undefined}
                className={`group relative bg-white dark:bg-[#2c1a12] rounded-2xl p-5 border text-center transition-all ${
                  lang.available
                    ? 'border-primary/8 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/8 hover:-translate-y-1 cursor-pointer'
                    : 'border-slate-100 dark:border-slate-800/50 opacity-45 cursor-default'
                }`}
              >
                <div className="text-4xl mb-3 transition-transform duration-200 group-hover:scale-110">
                  {lang.flag}
                </div>
                <p className="font-bold text-sm">{lang.name}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  lang.available
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {lang.tagline}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white/50 dark:bg-slate-800/10 border-y border-primary/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Real learners</p>
            <h2 className="text-3xl md:text-4xl font-bold">What people are saying</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name}
                className="bg-white dark:bg-[#2c1a12] rounded-2xl p-6 border border-primary/5 shadow-sm hover:shadow-md hover:border-primary/15 transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {t.flag}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <Suspense fallback={null}>
        <HowItWorks />
      </Suspense>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="relative bg-primary rounded-3xl p-10 md:p-16 text-center text-white overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="relative">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Start today</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Your first lesson takes 5 minutes.</h2>
              <p className="text-white/75 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                No downloads, no credit card. Pick a language and start speaking from day one.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login">
                  <button className="bg-white text-primary font-bold px-10 py-4 rounded-xl text-base hover:bg-white/92 transition-all active:scale-95 shadow-xl shadow-black/20">
                    Start for free →
                  </button>
                </Link>
                <p className="text-white/45 text-xs">No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-primary/10 py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">F</div>
            <span className="font-bold">Fluent</span>
          </Link>
          <p className="text-xs text-slate-400">© 2026 Fluent. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="text-xs text-slate-400 hover:text-primary transition-colors">Privacy</Link>
            <a href="#" className="text-xs text-slate-400 hover:text-primary transition-colors">Terms</a>
            <Link href="/login" className="text-xs text-slate-400 hover:text-primary transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
