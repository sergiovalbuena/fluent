'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/dashboard/language-switcher'
import { ChevronLeft, Flame, Star } from 'lucide-react'

interface AppTopbarProps {
  title?: string
  subtitle?: string
  back?: { href: string; label?: string }
}

export function AppTopbar({ title, subtitle, back }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#23140f]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-8 h-14">
        {/* Left side */}
        {back ? (
          <div className="flex items-center gap-1.5">
            <Link href={back.href}>
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors">
                <ChevronLeft size={18} />
              </button>
            </Link>
            {back.label && (
              <span className="text-sm font-semibold text-muted-foreground">{back.label}</span>
            )}
          </div>
        ) : (
          <>
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2">
              <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
              <span className="font-bold">Fluent</span>
            </div>
            {/* Desktop: title */}
            <p className="hidden md:block text-sm font-semibold text-muted-foreground">
              {title ?? ''}
              {subtitle && <span className="text-muted-foreground/60 ml-1.5">{subtitle}</span>}
            </p>
          </>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto mr-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold">
            <Flame size={12} />
            0
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-bold">
            <Star size={12} />
            0 XP
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
