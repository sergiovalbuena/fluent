'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Context ──────────────────────────────────────────────────────────────────

type SidebarContextType = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextType>({
  open: false,
  setOpen: () => {},
  animate: true,
})

export function useSidebar() {
  return useContext(SidebarContext)
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({
  children,
  open,
  setOpen,
  animate = true,
}: {
  children: React.ReactNode
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) {
  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ─── SidebarBody ──────────────────────────────────────────────────────────────

export function SidebarBody({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <>
      <DesktopSidebar className={className} {...props}>{children}</DesktopSidebar>
      <MobileSidebar>{children}</MobileSidebar>
    </>
  )
}

function DesktopSidebar({ children, className, ...props }: React.ComponentProps<'div'>) {
  const { open, setOpen, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        'hidden md:flex flex-col h-full fixed left-0 top-0 z-30 overflow-hidden',
        className,
      )}
      animate={{ width: animate ? (open ? 220 : 60) : 220 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}

function MobileSidebar({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar()

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-mobile-sidebar', handler)
    return () => window.removeEventListener('open-mobile-sidebar', handler)
  }, [setOpen])

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#f8f6f5] dark:bg-[#23140f] p-6 md:hidden"
          >
            <button
              className="self-end mb-6 text-slate-400 hover:text-primary"
              onClick={() => setOpen(false)}
            >
              <X size={22} />
            </button>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── SidebarGroup ─────────────────────────────────────────────────────────────

export function SidebarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-0.5', className)}>{children}</div>
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar()
  return (
    <motion.p
      animate={{
        opacity: animate ? (open ? 1 : 0) : 1,
        height: animate ? (open ? 'auto' : 0) : 'auto',
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap"
    >
      {children}
    </motion.p>
  )
}

export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-auto border-t border-primary/10 px-2 py-3', className)}>
      {children}
    </div>
  )
}

// ─── SidebarLink ──────────────────────────────────────────────────────────────

export type SidebarLinkItem = {
  label: string
  href: string
  icon: React.ReactNode
}

export function SidebarLink({
  link,
  className,
  active,
  onClick,
}: {
  link: SidebarLinkItem
  className?: string
  active?: boolean
  onClick?: () => void
}) {
  const { open, animate } = useSidebar()

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm',
        active
          ? 'bg-primary text-white shadow-md shadow-primary/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary',
        className,
      )}
    >
      <span className="shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? 'auto' : 0) : 'auto',
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="overflow-hidden whitespace-nowrap"
      >
        {link.label}
      </motion.span>
    </Link>
  )
}
