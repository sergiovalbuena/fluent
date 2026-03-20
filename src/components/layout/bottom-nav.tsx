'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Trophy, Bot, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem =
  | { type: 'link'; href: string; icon: React.ElementType; label: string }
  | { type: 'action'; action: () => void; icon: React.ElementType; label: string }

const navItems: NavItem[] = [
  { type: 'action', action: () => window.dispatchEvent(new CustomEvent('open-mobile-sidebar')), icon: Menu, label: 'Menu' },
  { type: 'link', href: '/learn', icon: BookOpen, label: 'Lessons' },
  { type: 'link', href: '/dashboard', icon: Home, label: 'Home' },
  { type: 'link', href: '/play', icon: Trophy, label: 'Challenge' },
  { type: 'link', href: '/maria', icon: Bot, label: 'MarIA' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-primary/10 bg-[#f8f6f5]/90 dark:bg-[#23140f]/90 backdrop-blur-md px-2 pb-6 pt-3 flex justify-around items-center z-20">
      {navItems.map((item) => {
        if (item.type === 'action') {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          )
        }

        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
