'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatePresence, motion } from 'framer-motion'

const navLinks = [
  { label: 'Features',     href: '#features'      },
  { label: 'Languages',    href: '#languages'     },
  { label: 'How it works', href: '#how-it-works'  },
]

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#23140f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
            <span className="text-lg font-bold tracking-tight">Fluent</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link href="/login" className="hidden sm:block">
              <button className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95">
                Get Started
              </button>
            </Link>
            {/* Hamburger — mobile only */}
            <button
              className="sm:hidden p-2 rounded-xl hover:bg-primary/10 transition-colors"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
              onClick={() => setMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-16 left-0 right-0 z-50 sm:hidden bg-[#f8f6f5] dark:bg-[#23140f] border-b border-primary/10 shadow-xl"
            >
              <nav className="flex flex-col px-4 py-3 gap-1">
                {navLinks.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-3 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="border-t border-primary/10 mt-2 pt-3 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-primary/20 hover:border-primary/40 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    <button className="w-full bg-primary text-white text-sm font-bold px-4 py-3 rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95">
                      Get Started →
                    </button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
