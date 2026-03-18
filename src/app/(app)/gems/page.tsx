import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'
import { Gem, BookMarked, Lightbulb, Languages, AlertCircle, Smile } from 'lucide-react'

const categories = [
  {
    icon: Lightbulb,
    title: 'Grammar Tips',
    description: 'Quick, clear explanations of grammar rules without the textbook pain.',
    color: 'bg-yellow-400/10 text-yellow-500',
  },
  {
    icon: Languages,
    title: 'False Friends',
    description: 'Words that look similar in two languages but mean very different things.',
    color: 'bg-red-400/10 text-red-500',
  },
  {
    icon: Smile,
    title: 'Idioms & Slang',
    description: 'Sound natural with expressions locals actually use every day.',
    color: 'bg-green-400/10 text-green-500',
  },
  {
    icon: AlertCircle,
    title: 'Common Mistakes',
    description: 'The errors most learners make — and how to avoid them.',
    color: 'bg-orange-400/10 text-orange-500',
  },
  {
    icon: BookMarked,
    title: 'Cultural Notes',
    description: 'Context and culture that helps you use the language appropriately.',
    color: 'bg-purple-400/10 text-purple-500',
  },
]

export default function GemsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center p-4 justify-between sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl font-bold">Gems</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col p-5 gap-6 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Gem size={34} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Language Gems</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Bite-sized tips and insights to level up your understanding of the language.
            </p>
          </div>
        </div>

        {/* Featured gem placeholder */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Gem size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Gem of the Day</span>
          </div>
          <p className="font-bold text-base">
            "Ser" vs "Estar" — both mean "to be" in Spanish, but they're not interchangeable.
          </p>
          <p className="text-muted-foreground text-sm">
            Use <strong>ser</strong> for permanent traits (origin, identity, characteristics).
            Use <strong>estar</strong> for temporary states (feelings, location, conditions).
          </p>
          <div className="flex gap-3 pt-1 text-xs text-muted-foreground">
            <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Grammar</span>
            <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Spanish</span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Categories</h3>
          <div className="flex flex-col gap-3">
            {categories.map(({ icon: Icon, title, description, color }) => (
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
                      Coming soon
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>
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
