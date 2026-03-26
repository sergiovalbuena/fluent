'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { X, Menu, Globe, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatePresence, motion } from 'framer-motion'

const LANGUAGES = [
  { flag: '🇪🇸', name: 'Spanish',    sub: 'Most popular' },
  { flag: '🇫🇷', name: 'French',     sub: '50+ modules'  },
  { flag: '🇧🇷', name: 'Portuguese', sub: 'Available'    },
  { flag: '🇩🇪', name: 'German',     sub: 'Available'    },
  { flag: '🇮🇹', name: 'Italian',    sub: 'Available'    },
  { flag: '🇯🇵', name: 'Japanese',   sub: 'Available'    },
]

const navLinks = [
  { label: 'Features',     href: '#features'     },
  { label: 'How it works', href: '#how-it-works' },
]

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-[#f8f6f5]/80 dark:bg-[#23140f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
            <span className="text-lg font-bold tracking-tight">Fluent</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l.href} href={l.href}
                className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5">

            {/* Language picker */}
            <div ref={langRef} className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/8 transition-colors"
              >
                <Globe size={15} />
                <span className="hidden lg:inline">Languages</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#2c1a12] border border-primary/10 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-50"
                  >
                    <div className="p-1.5">
                      <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Select language</p>
                      {LANGUAGES.map(lang => (
                        <a key={lang.name} href="#languages" onClick={() => setLangOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-primary/8 hover:text-primary transition-colors group">
                          <span className="text-xl">{lang.flag}</span>
                          <span className="flex-1">{lang.name}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-primary/60">{lang.sub}</span>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle />

            <Link href="/login"
              className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors px-3 py-1.5">
              Sign in
            </Link>

            <Link href="/login" className="hidden sm:block">
              <button className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-colors active:scale-95">
                Get Started
              </button>
            </Link>

            {/* Hamburger — mobile only */}
            <button
              className="sm:hidden p-2 rounded-xl hover:bg-primary/10 transition-colors"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-16 left-0 right-0 z-50 sm:hidden bg-[#f8f6f5] dark:bg-[#23140f] border-b border-primary/10 shadow-xl"
            >
              <nav className="flex flex-col px-4 py-3 gap-0.5">
                {navLinks.map(l => (
                  <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    className="flex items-center px-3 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors">
                    {l.label}
                  </a>
                ))}

                <div className="px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <a key={lang.name} href="#languages" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/6 hover:bg-primary/12 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span>{lang.flag}</span>
                        <span className="text-xs">{lang.name}</span>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="border-t border-primary/10 mt-1 pt-3 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-primary/20 hover:border-primary/40 transition-colors">
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
