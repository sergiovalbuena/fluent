'use client'

import { useState } from 'react'
import { ChevronDown, ChevronLeft, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const faqs = [
  {
    category: 'Getting Started',
    icon: '🚀',
    items: [
      {
        q: 'How do I start learning a language?',
        a: "Go to the Learn tab and pick a module. Each module has bite-sized lessons — vocabulary, phrases, short stories, and Q&A exercises. Just tap the first lesson and you're off.",
      },
      {
        q: 'What languages are available?',
        a: 'Currently Spanish, French, Portuguese, Italian, German, and Japanese. More are on the way — check back soon!',
      },
      {
        q: 'Do I need to create an account?',
        a: "You can explore freely without an account. Signing in lets us sync your streak, XP, and progress across devices so you never lose your place.",
      },
    ],
  },
  {
    category: 'Learning & Progress',
    icon: '📈',
    items: [
      {
        q: 'How does the streak work?',
        a: 'Complete at least one lesson per day to maintain your streak. Miss a day and it resets to zero. Your longest streak is always saved in your profile.',
      },
      {
        q: 'What is XP?',
        a: 'XP (experience points) are awarded for completing lessons and quizzes. Higher scores earn more XP. XP tracks your overall learning activity across all languages.',
      },
      {
        q: 'Can I change my daily goal?',
        a: 'Yes — go to Profile → Learning → Daily Goal and pick between 5, 10, or 20 minutes per day. You can change this anytime.',
      },
    ],
  },
  {
    category: 'Account & Settings',
    icon: '⚙️',
    items: [
      {
        q: 'How do I change my app language?',
        a: 'Go to Profile → Account → App Language and pick your preferred interface language. This controls the app menus, not the language you are learning.',
      },
      {
        q: 'How do I turn on reminders?',
        a: 'Go to Profile → Learning → Reminder Time and pick a time that works for you. You can also toggle notifications under Profile → Account → Notifications.',
      },
      {
        q: 'How do I change my learning language?',
        a: 'Go to Profile → Profile Setup to redo your onboarding and pick a different language to learn.',
      },
    ],
  },
  {
    category: 'Troubleshooting',
    icon: '🔧',
    items: [
      {
        q: 'My progress was lost — what happened?',
        a: "Progress is stored on your account when you're signed in. If you were browsing as a guest, progress isn't persisted across sessions. Sign in and redo the lesson to restore your XP.",
      },
      {
        q: "The app isn't loading properly.",
        a: 'Try refreshing the page. If the issue persists, clear your browser cache or try a different browser. For persistent issues, contact us below.',
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-primary/5 last:border-0">
      <button
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-primary/5 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex-1 text-sm font-medium">{q}</span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground shrink-0 transition-transform duration-200 mt-0.5 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      )}
    </div>
  )
}

export default function HelpCenterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 md:px-8 py-4 md:py-5 sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <Link href="/profile" className="size-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors">
          <ChevronLeft size={18} className="text-muted-foreground" />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold">Help Center</h1>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative bg-primary rounded-3xl p-6 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <p className="text-3xl mb-3">💬</p>
            <h2 className="text-xl font-bold">How can we help?</h2>
            <p className="text-sm text-white/70 mt-1">Browse the FAQ below or reach out directly.</p>
          </div>

          {/* FAQ sections */}
          {faqs.map(section => (
            <section key={section.category}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-base">{section.icon}</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {section.category}
                </h3>
              </div>
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 overflow-hidden">
                {section.items.map(item => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </section>
          ))}

          {/* Contact */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Still need help?</h3>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
              <a
                href="mailto:support@fluent.app"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors"
              >
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Email Support</p>
                  <p className="text-xs text-muted-foreground">support@fluent.app</p>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors"
              >
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageCircle size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Community Forum</p>
                  <p className="text-xs text-muted-foreground">Join other learners</p>
                </div>
              </a>
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground pb-4">
            Fluent v1.0.0 · We typically respond within 24 hours
          </p>
        </div>
      </main>
    </div>
  )
}
