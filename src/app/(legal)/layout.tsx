import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Public legal pages (privacy, terms): no app sidebar, readable signed in or out
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const back = user ? { href: '/profile', label: 'Back to profile' } : { href: '/', label: 'Back to home' }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f6f5] dark:bg-[#1b2030]">
      <header className="sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#1b2030]/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link
            href={back.href}
            className="flex items-center gap-1 rounded-xl px-2 py-1.5 -ml-2 text-sm font-semibold text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            {back.label}
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">F</span>
            <span className="font-bold">Fluent</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
