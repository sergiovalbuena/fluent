import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { getCopy } from '@/lib/marketing/copy'
import { courseSlugFor, type SiteLocale } from '@/lib/marketing/i18n'
import { COURSE_CODES, COURSE_FLAGS } from '@/lib/marketing/data'
import { cn } from '@/lib/utils'

// Shared building blocks for the marketing pages (server components).

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto max-w-6xl px-4 md:px-8', className)}>{children}</div>
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('mb-3 text-xs font-bold uppercase tracking-widest text-primary', className)}>{children}</p>
}

export function SectionHeading({ eyebrow, title, sub, center = true }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={cn('mb-12 md:mb-14', center && 'mx-auto max-w-2xl text-center')}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {sub && <p className="mt-4 leading-relaxed text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

/** Hero for the inner pages */
export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
      <Container className="relative pb-12 pt-14 md:pb-16 md:pt-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">{sub}</p>
        {children}
      </Container>
    </section>
  )
}

export function StatRow({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
      {items.map(s => (
        <div key={s.label}>
          <dt className="sr-only">{s.label}</dt>
          <dd className="text-3xl font-bold tabular-nums text-primary">{s.value}</dd>
          <dd className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(item => (
        <li key={item} className="flex gap-3 text-[15px] text-slate-600 dark:text-slate-300">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Check size={12} strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-bold text-primary">
      {children}
      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

export function PrimaryButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href}
      className={cn('inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95', className)}>
      {children}
    </Link>
  )
}

export function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition-all hover:border-primary/30 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200">
      {children}
    </Link>
  )
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-primary/8 bg-white p-6 dark:border-white/[0.06] dark:bg-[#202638]', className)}>
      {children}
    </div>
  )
}

export function CtaBanner({ locale }: { locale: SiteLocale }) {
  const c = getCopy(locale).cta
  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-white md:p-16">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-60 w-60 -translate-x-1/3 translate-y-1/2 rounded-full bg-white/10" />
          <div className="relative">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/60">{c.eyebrow}</p>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{c.title}</h2>
            <p className="mx-auto mb-8 max-w-md text-lg leading-relaxed text-white/75">{c.body}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup"
                className="rounded-xl bg-white px-10 py-4 text-base font-bold text-primary shadow-xl shadow-black/20 transition-all hover:bg-white/90 active:scale-95">
                {getCopy(locale).startFree} →
              </Link>
              <p className="text-xs text-white/50">{c.note}</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function SiteFooter({ locale }: { locale: SiteLocale }) {
  const c = getCopy(locale)
  const column = (title: string, links: { href: string; label: string }[]) => (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <ul className="flex flex-col gap-2">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <footer className="border-t border-primary/10 py-12">
      <Container className="grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">F</div>
            <span className="font-bold">Fluent</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">{c.footer.tagline}</p>
          <p className="mt-6 text-xs text-slate-400">{c.footer.rights}</p>
        </div>
        {column(c.footer.courses, COURSE_CODES.map(code => ({
          href: `/${locale}/courses/${courseSlugFor(code)}`,
          label: `${COURSE_FLAGS[code]} ${c.courseNames[code]}`,
        })))}
        {column(c.footer.product, [
          { href: `/${locale}/grammar`, label: c.nav.grammar },
          { href: `/${locale}/verbs`, label: c.nav.verbs },
          { href: `/${locale}/maria`, label: c.nav.maria },
          { href: '/login', label: c.signIn },
        ])}
        {column(c.footer.legal, [
          { href: '/privacy-policy', label: c.footer.privacy },
          { href: '/terms', label: c.footer.terms },
        ])}
      </Container>
    </footer>
  )
}
