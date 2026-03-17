'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart2, User, RefreshCw, Home } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/learn', icon: BookOpen, label: 'Lessons' },
  { href: '/review', icon: RefreshCw, label: 'Review' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full flex-col border-r border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f] z-30 w-16 lg:w-56 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 lg:px-5 py-5 border-b border-primary/10">
        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
          F
        </div>
        <span className="hidden lg:block text-lg font-bold tracking-tight">Fluent</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 p-2 lg:p-3 pt-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 lg:p-3 border-t border-primary/10 flex justify-center lg:justify-start lg:px-4">
        <ThemeToggle />
      </div>
    </aside>
  )
}
