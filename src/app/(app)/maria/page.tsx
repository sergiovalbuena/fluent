import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'
import { Bot, MessageSquare, Mic, RotateCcw, Target } from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    title: 'Free Conversation',
    description: 'Chat freely about any topic. MarIA adapts to your level.',
    color: 'bg-blue-400/10 text-blue-500',
  },
  {
    icon: Target,
    title: 'Scenario Practice',
    description: 'Practice real-life situations like ordering food or asking for directions.',
    color: 'bg-green-400/10 text-green-500',
  },
  {
    icon: Mic,
    title: 'Pronunciation Help',
    description: 'Get instant feedback on how you sound and tips to improve.',
    color: 'bg-purple-400/10 text-purple-500',
  },
  {
    icon: RotateCcw,
    title: 'Grammar Corrections',
    description: 'MarIA gently corrects your mistakes and explains why.',
    color: 'bg-orange-400/10 text-orange-500',
  },
]

export default function MariaPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center p-4 justify-between sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl font-bold">MarIA</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col p-5 gap-6 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3 pt-4 pb-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Bot size={38} className="text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-[#f8f6f5] dark:border-[#23140f]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Meet MarIA</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Your personal AI language tutor. Practice conversation anytime, get instant corrections, and build real fluency.
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">
            Coming soon
          </span>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-3">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="flex items-start gap-4 bg-primary/5 rounded-2xl p-4"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm">{title}</span>
                <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA placeholder */}
        <div className="rounded-2xl border border-dashed border-primary/30 p-5 text-center space-y-2">
          <p className="text-sm font-bold">Be the first to try MarIA</p>
          <p className="text-xs text-muted-foreground">
            We&apos;re training MarIA to be the best language tutor you&apos;ve ever had. Stay tuned!
          </p>
        </div>

        <Link href="/dashboard" className="mt-auto">
          <button className="w-full bg-primary text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform">
            Back to Learning
          </button>
        </Link>
      </main>
    </div>
  )
}
