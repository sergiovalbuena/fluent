'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Globe, Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getCopy } from '@/lib/marketing/copy'
import { localizedPath, SITE_LOCALE_COOKIE, type SiteLocale } from '@/lib/marketing/i18n'
import { cn } from '@/lib/utils'

/** Remembers the choice so `/` opens in this language next time */
function rememberLocale(locale: SiteLocale) {
  document.cookie = `${SITE_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}

export function SiteHeader({ locale }: { locale: SiteLocale }) {
  const c = getCopy(locale)
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const other: SiteLocale = locale === 'es' ? 'en' : 'es'
  // `/` is rewritten to /es or /en, so the visible path may have no locale yet
  const current = pathname === '/' ? `/${locale}` : pathname

  const links = [
    { href: `/${locale}#courses`, label: c.nav.courses },
    { href: `/${locale}/grammar`, label: c.nav.grammar },
    { href: `/${locale}/verbs`, label: c.nav.verbs },
    { href: `/${locale}/maria`, label: c.nav.maria },
  ]
  const isActive = (href: string) => !href.includes('#') && current.startsWith(href)

  const languageSwitch = (
    <Link
      href={localizedPath(current, other)}
      hrefLang={other}
      onClick={() => { rememberLocale(other); setMenuOpen(false) }}
      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-primary/8 hover:text-primary dark:text-slate-400"
    >
      <Globe size={15} />
      {c.switchLabel}
    </Link>
  )

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-[#f8f6f5]/80 backdrop-blur-md dark:bg-[#1b2030]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">F</div>
            <span className="text-lg font-bold tracking-tight">Fluent</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={cn('text-sm font-semibold transition-colors hover:text-primary', isActive(l.href) ? 'text-primary' : 'text-slate-500 dark:text-slate-400')}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">{languageSwitch}</div>
            <ThemeToggle />
            <Link href="/login" className="hidden px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-primary dark:text-slate-300 sm:block">
              {c.signIn}
            </Link>
            <Link href="/signup"
              className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary/90 active:scale-95 sm:block">
              {c.getStarted}
            </Link>
            <button
              className="rounded-xl p-2 transition-colors hover:bg-primary/10 md:hidden"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={c.menu}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 right-0 top-16 z-50 border-b border-primary/10 bg-[#f8f6f5] shadow-xl dark:bg-[#1b2030] md:hidden"
            >
              <nav className="flex flex-col gap-0.5 px-4 py-3">
                {links.map(l => (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary dark:text-slate-200">
                    {l.label}
                  </Link>
                ))}
                <div className="px-0 py-1">{languageSwitch}</div>
                <div className="mt-1 flex flex-col gap-2 border-t border-primary/10 pt-3">
                  <Link href="/login" onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center rounded-xl border border-primary/20 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-primary/40 dark:text-slate-300">
                    {c.signIn}
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary/90">
                    {c.startFree} →
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
