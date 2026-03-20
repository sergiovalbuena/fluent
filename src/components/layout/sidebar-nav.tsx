'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, User, Home, Gamepad2, Gem, Bot, ChevronDown, BookOpen, Video, Users } from 'lucide-react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarGroup,
  SidebarFooter,
  useSidebar,
  type SidebarLinkItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type Module = { slug: string; title: string; icon: string }

const topLinks: SidebarLinkItem[] = [
  { href: '/dashboard', icon: <Home size={20} strokeWidth={1.8} />, label: 'Home' },
]

const bottomLinks: SidebarLinkItem[] = [
  { href: '/play', icon: <Gamepad2 size={20} strokeWidth={1.8} />, label: 'Play' },
  { href: '/gems', icon: <Gem size={20} strokeWidth={1.8} />, label: 'Gems' },
  { href: '/maria', icon: <Bot size={20} strokeWidth={1.8} />, label: 'MarIA' },
  { href: '/videos', icon: <Video size={20} strokeWidth={1.8} />, label: 'Videos' },
  { href: '/community', icon: <Users size={20} strokeWidth={1.8} />, label: 'Community' },
  { href: '/progress', icon: <BarChart2 size={20} strokeWidth={1.8} />, label: 'Progress' },
]

const profileLink: SidebarLinkItem = {
  href: '/profile',
  icon: <User size={20} strokeWidth={1.8} />,
  label: 'Profile',
}

function SidebarContent({ modules }: { modules: Module[] }) {
  const pathname = usePathname()
  const { open: sidebarOpen, animate } = useSidebar()
  const [lessonsOpen, setLessonsOpen] = useState(true)

  useEffect(() => {
    if (!sidebarOpen) setLessonsOpen(false)
  }, [sidebarOpen])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const anyLessonActive = modules.some(m => isActive(`/learn/${m.slug}`))

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-5 border-b border-primary/10 mb-2 shrink-0">
        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
          F
        </div>
        <m.span
          animate={{
            opacity: animate ? (sidebarOpen ? 1 : 0) : 1,
            width: animate ? (sidebarOpen ? 'auto' : 0) : 'auto',
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden whitespace-nowrap text-lg font-bold tracking-tight"
        >
          Fluent
        </m.span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 flex flex-col px-2 pt-1 overflow-y-auto gap-0.5">

        {/* Home */}
        <SidebarGroup>
          {topLinks.map(link => (
            <SidebarLink
              key={link.href}
              link={link}
              active={pathname === '/dashboard'}
            />
          ))}
        </SidebarGroup>

        {/* Lessons collapsible — second position */}
        <SidebarGroup className="mt-0.5">
          <Link
            href="/learn"
            onClick={() => setLessonsOpen(v => !v)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all font-medium text-sm',
              anyLessonActive || pathname === '/learn'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary',
            )}
          >
            <BookOpen size={20} strokeWidth={1.8} className="shrink-0" />
            <m.span
              animate={{
                opacity: animate ? (sidebarOpen ? 1 : 0) : 1,
                width: animate ? (sidebarOpen ? 'auto' : 0) : 'auto',
              }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-1 overflow-hidden whitespace-nowrap text-left"
            >
              Lessons
            </m.span>
            <m.span
              animate={{
                opacity: animate ? (sidebarOpen ? 1 : 0) : 1,
                width: animate ? (sidebarOpen ? 'auto' : 0) : 'auto',
                rotate: lessonsOpen ? 180 : 0,
              }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden shrink-0"
            >
              <ChevronDown size={14} />
            </m.span>
          </Link>

          <AnimatePresence initial={false}>
            {lessonsOpen && (
              <m.div
                key="lessons-dropdown"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="ml-3 pl-3 border-l border-primary/15 flex flex-col gap-0.5 py-1 max-h-52 overflow-y-auto scrollbar-none">
                  {modules.map(mod => (
                    <SidebarLink
                      key={mod.slug}
                      link={{
                        href: `/learn/${mod.slug}`,
                        icon: <span className="text-base leading-none">{mod.icon}</span>,
                        label: mod.title,
                      }}
                      active={isActive(`/learn/${mod.slug}`)}
                    />
                  ))}
                  {modules.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">No lessons yet</p>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </SidebarGroup>

        {/* Rest of links */}
        <SidebarGroup className="mt-0.5">
          {bottomLinks.map(link => (
            <SidebarLink key={link.href} link={link} active={isActive(link.href)} />
          ))}
        </SidebarGroup>
      </nav>

      {/* Footer — Profile + Theme */}
      <SidebarFooter>
        <SidebarLink link={profileLink} active={isActive('/profile')} />
        <div className="mt-1 px-1">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </div>
  )
}

export function SidebarNav({ modules }: { modules: Module[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="border-r border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <SidebarContent modules={modules} />
      </SidebarBody>
    </Sidebar>
  )
}
