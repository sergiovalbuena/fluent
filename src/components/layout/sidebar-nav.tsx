'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart2, User, RefreshCw, Home, Gamepad2, Gem, Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
  type SidebarLinkItem,
} from '@/components/ui/sidebar'

const navLinks: SidebarLinkItem[] = [
  { href: '/dashboard', icon: <Home size={20} strokeWidth={1.8} />, label: 'Home' },
  { href: '/learn', icon: <BookOpen size={20} strokeWidth={1.8} />, label: 'Lessons' },
  { href: '/play', icon: <Gamepad2 size={20} strokeWidth={1.8} />, label: 'Play' },
  { href: '/gems', icon: <Gem size={20} strokeWidth={1.8} />, label: 'Gems' },
  { href: '/maria', icon: <Bot size={20} strokeWidth={1.8} />, label: 'MarIA' },
  { href: '/review', icon: <RefreshCw size={20} strokeWidth={1.8} />, label: 'Review' },
  { href: '/progress', icon: <BarChart2 size={20} strokeWidth={1.8} />, label: 'Progress' },
  { href: '/profile', icon: <User size={20} strokeWidth={1.8} />, label: 'Profile' },
]

function SidebarContent() {
  const pathname = usePathname()
  const { open, animate } = useSidebar()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-5 border-b border-primary/10 mb-2 shrink-0">
        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
          F
        </div>
        <motion.span
          animate={{
            opacity: animate ? (open ? 1 : 0) : 1,
            width: animate ? (open ? 'auto' : 0) : 'auto',
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden whitespace-nowrap text-lg font-bold tracking-tight"
        >
          Fluent
        </motion.span>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 px-2 pt-1">
        {navLinks.map(link => {
          const isActive =
            pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'))
          return (
            <SidebarLink
              key={link.href}
              link={link}
              active={isActive}
            />
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-primary/10">
        <ThemeToggle />
      </div>
    </div>
  )
}

export function SidebarNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="border-r border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <SidebarContent />
      </SidebarBody>
    </Sidebar>
  )
}
