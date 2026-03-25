'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Trophy, Bot, Menu, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export function BottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const navItems = [
    { type: 'action' as const, action: () => window.dispatchEvent(new CustomEvent('open-mobile-sidebar')), icon: Menu, label: t('menu') },
    { type: 'link' as const, href: '/learn', icon: BookOpen, label: t('lessons') },
    { type: 'link' as const, href: '/dashboard', icon: Home, label: t('home') },
    { type: 'link' as const, href: '/saved', icon: Bookmark, label: t('saved') },
    { type: 'link' as const, href: '/maria', icon: Bot, label: t('maria') },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-primary/10 bg-[#f8f6f5]/90 dark:bg-[#23140f]/90 backdrop-blur-md px-2 pb-6 pt-3 flex justify-around items-center z-20">
      {navItems.map((item) => {
        if (item.type === 'action') {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon size={22} strokeWidth={1.5} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
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
              'flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
