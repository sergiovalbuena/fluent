'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, User, Home, Gamepad2, Gem, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/learn', icon: BookOpen, label: 'Lessons' },
  { href: '/play', icon: Gamepad2, label: 'Play' },
  { href: '/gems', icon: Gem, label: 'Gems' },
  { href: '/maria', icon: Bot, label: 'MarIA' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-primary/10 bg-[#f8f6f5]/90 dark:bg-[#23140f]/90 backdrop-blur-md px-2 pb-6 pt-3 flex justify-around items-center z-20">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
