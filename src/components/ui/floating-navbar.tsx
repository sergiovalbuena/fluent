'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { cn } from '@/lib/utils'

type NavItem = {
  name: string
  link: string
  icon?: React.ReactNode
}

export function FloatingNav({
  navItems,
  className,
}: {
  navItems: NavItem[]
  className?: string
}) {
  const { scrollYProgress } = useScroll()
  const [visible, setVisible] = useState(true)
  const [atTop, setAtTop] = useState(true)

  useMotionValueEvent(scrollYProgress, 'change', current => {
    if (typeof current === 'number') {
      const direction = current - (scrollYProgress.getPrevious() ?? 0)
      setAtTop(window.scrollY < 60)
      if (window.scrollY < 60) {
        setVisible(true)
      } else if (direction < 0) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }
  })

  // Also show on first paint before any scroll
  useEffect(() => {
    setAtTop(window.scrollY < 60)
  }, [])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-4 inset-x-0 mx-auto z-[5000] flex max-w-fit items-center justify-center gap-2 rounded-full px-4 py-2.5',
          atTop
            ? 'bg-transparent shadow-none border-transparent'
            : 'border border-black/[0.1] dark:border-white/[0.1] bg-white/80 dark:bg-[#1c0e09]/80 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.08)]',
          'transition-[background,border,box-shadow] duration-300',
          className,
        )}
      >
        {navItems.map(item => (
          <a
            key={item.name}
            href={item.link}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary',
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="hidden sm:block">{item.name}</span>
          </a>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
