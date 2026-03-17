import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'

export default function ReviewPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center p-4 justify-between sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <h1 className="text-xl font-bold">Review</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw size={40} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Review Coming Soon</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Spaced repetition review sessions will help you retain everything you've learned. Check back soon!
          </p>
        </div>
        <div className="bg-primary/5 rounded-2xl p-5 w-full max-w-sm space-y-3">
          <h3 className="font-bold text-sm">What to expect:</h3>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✦</span>
              Smart spaced repetition algorithm
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✦</span>
              Review words before you forget them
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✦</span>
              Track your retention over time
            </li>
          </ul>
        </div>
        <Link href="/dashboard">
          <button className="bg-primary text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform">
            Back to Learning
          </button>
        </Link>
      </main>
    </div>
  )
}
