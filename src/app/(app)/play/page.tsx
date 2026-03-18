import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'
import { Gamepad2, Zap, Trophy, Shuffle, Headphones, PenLine } from 'lucide-react'

const activities = [
  {
    icon: Zap,
    title: 'Speed Round',
    description: 'Match words as fast as you can before time runs out.',
    color: 'bg-yellow-400/10 text-yellow-500',
    tag: 'Coming soon',
  },
  {
    icon: Shuffle,
    title: 'Word Scramble',
    description: 'Unscramble jumbled letters to form the correct word.',
    color: 'bg-blue-400/10 text-blue-500',
    tag: 'Coming soon',
  },
  {
    icon: Headphones,
    title: 'Listening Challenge',
    description: 'Listen to audio and pick the right translation.',
    color: 'bg-purple-400/10 text-purple-500',
    tag: 'Coming soon',
  },
  {
    icon: PenLine,
    title: 'Fill in the Blank',
    description: 'Complete sentences by choosing the missing word.',
    color: 'bg-green-400/10 text-green-500',
    tag: 'Coming soon',
  },
  {
    icon: Trophy,
    title: 'Daily Challenge',
    description: 'A new set of activities every day. Earn bonus XP!',
    color: 'bg-primary/10 text-primary',
    tag: 'Coming soon',
  },
]

export default function PlayPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center p-4 justify-between sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl font-bold">Play &amp; Practice</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col p-5 gap-6 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Gamepad2 size={34} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Games &amp; Activities</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Learn through play. Practice vocabulary and grammar with fun mini-games.
            </p>
          </div>
        </div>

        {/* Activity cards */}
        <div className="flex flex-col gap-3">
          {activities.map(({ icon: Icon, title, description, color, tag }) => (
            <div
              key={title}
              className="flex items-start gap-4 bg-primary/5 rounded-2xl p-4 opacity-80"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{title}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
              </div>
            </div>
          ))}
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
