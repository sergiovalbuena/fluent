'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart2, User, RefreshCw, Home, Gamepad2, Gem, Bot } from 'lucide-react'
import { motion as m } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  useSidebar,
  type SidebarLinkItem,
} from '@/components/ui/sidebar'

const mainLinks: SidebarLinkItem[] = [
  { href: '/dashboard', icon: <Home size={20} strokeWidth={1.8} />, label: 'Home' },
]

const lessonLinks: SidebarLinkItem[] = [
  { href: '/learn', icon: <BookOpen size={20} strokeWidth={1.8} />, label: 'Lessons' },
  { href: '/play', icon: <Gamepad2 size={20} strokeWidth={1.8} />, label: 'Play' },
  { href: '/gems', icon: <Gem size={20} strokeWidth={1.8} />, label: 'Gems' },
  { href: '/maria', icon: <Bot size={20} strokeWidth={1.8} />, label: 'MarIA' },
  { href: '/review', icon: <RefreshCw size={20} strokeWidth={1.8} />, label: 'Review' },
  { href: '/progress', icon: <BarChart2 size={20} strokeWidth={1.8} />, label: 'Progress' },
]

const profileLink: SidebarLinkItem = {
  href: '/profile',
  icon: <User size={20} strokeWidth={1.8} />,
  label: 'Profile',
}

function SidebarContent() {
  const pathname = usePathname()
  const { open, animate } = useSidebar()

  const isActive = (link: SidebarLinkItem) =>
    pathname === link.href ||
    (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'))

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-5 border-b border-primary/10 mb-2 shrink-0">
        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
          F
        </div>
        <m.span
          animate={{
            opacity: animate ? (open ? 1 : 0) : 1,
            width: animate ? (open ? 'auto' : 0) : 'auto',
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden whitespace-nowrap text-lg font-bold tracking-tight"
        >
          Fluent
        </m.span>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col px-2 pt-1 overflow-y-auto">
        <SidebarGroup>
          {mainLinks.map(link => (
            <SidebarLink key={link.href} link={link} active={isActive(link)} />
          ))}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Lessons</SidebarGroupLabel>
          {lessonLinks.map(link => (
            <SidebarLink key={link.href} link={link} active={isActive(link)} />
          ))}
        </SidebarGroup>
      </nav>

      {/* Footer — Profile + Theme */}
      <SidebarFooter>
        <SidebarLink link={profileLink} active={isActive(profileLink)} />
        <div className="mt-1 px-1">
          <ThemeToggle />
        </div>
      </SidebarFooter>
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
