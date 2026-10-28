import Link from 'next/link'
import {
  BookOpen, BookText, Bookmark, Gamepad2, Gem, Languages, MessageSquareQuote, MessagesSquare,
  Plane, Shuffle, Star, Users, Volume2, Zap, type LucideIcon,
} from 'lucide-react'
import { getCopy, formatNumber } from '@/lib/marketing/copy'
import type { SiteLocale } from '@/lib/marketing/i18n'
import type { CourseSummary } from '@/lib/marketing/data'
import type { GrammarIndexEntry } from '@/lib/grammar'
import { ArrowLink, Card, CheckList, Container, Eyebrow, SectionHeading } from './site-ui'
import { LevelBadge } from './level-badge'
import { cn } from '@/lib/utils'

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  vocabulary: BookOpen, phrases: MessageSquareQuote, qa: MessagesSquare, story: BookText, arrange: Shuffle, translate: Languages,
}

const MORE_ICONS: Record<string, LucideIcon> = { gamepad: Gamepad2, users: Users, plane: Plane, gem: Gem, bookmark: Bookmark, zap: Zap }

export function ActivityGrid({ locale }: { locale: SiteLocale }) {
  const c = getCopy(locale)
  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {c.activities.map((a, i) => {
        const Icon = ACTIVITY_ICONS[a.key]
        return (
          <li key={a.key}>
            <Card className="h-full">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={18} /></div>
                <span className="text-xs font-black text-slate-300 dark:text-slate-600">0{i + 1}</span>
              </div>
              <p className="mb-1 font-bold">{a.title}</p>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{a.body}</p>
            </Card>
          </li>
        )
      })}
    </ol>
  )
}

export function CourseCards({ locale, courses }: { locale: SiteLocale; courses: CourseSummary[] }) {
  const c = getCopy(locale)
  const k = c.home.courses
  // Courses written for this visitor first
  const sorted = [...courses].sort((a, b) => Number(b.learners.includes(locale)) - Number(a.learners.includes(locale)))

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {sorted.map(course => {
        const forYou = course.learners.includes(locale)
        return (
          <Link key={course.code} href={`/${locale}/courses/${course.slug}`}
            className="group flex flex-col rounded-3xl border border-primary/8 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 dark:border-white/[0.06] dark:bg-[#202638]">
            <div className="mb-5 flex items-start justify-between">
              <span className="text-5xl transition-transform group-hover:scale-110">{course.flag}</span>
              {forYou && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">{c.madeForYou}</span>}
            </div>
            <h3 className="text-xl font-bold">{c.courseNames[course.code]}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">{c.forLearners(course.learners.map(l => c.learnerNames[l]))}</p>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{c.course.intro[course.code]}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-primary/8 pt-5 dark:border-white/[0.06]">
              {[
                [course.lessons, k.lessons],
                [course.words, k.words],
                ...(course.grammarModules ? [[course.grammarModules, k.grammar] as const] : []),
                [course.verbs, k.verbs],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-lg font-bold tabular-nums">{formatNumber(locale, n as number)}</dd>
                  <dd className="text-[11px] font-medium text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
            <span className="mt-5 text-sm font-bold text-primary">{k.see} →</span>
          </Link>
        )
      })}
    </div>
  )
}

/** Text column + visual column, alternating sides */
export function Showcase({ eyebrow, title, body, bullets, link, flip, children }: {
  eyebrow: string
  title: string
  body: string
  bullets?: string[]
  link?: { href: string; label: string }
  flip?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn(flip && 'lg:order-2')}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mb-4 text-3xl font-bold tracking-tight">{title}</h3>
        <p className="mb-6 leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
        {bullets && <div className="mb-7"><CheckList items={bullets} /></div>}
        {link && <ArrowLink href={link.href}>{link.label}</ArrowLink>}
      </div>
      <div className={cn(flip && 'lg:order-1')}>{children}</div>
    </div>
  )
}

/** A few real grammar modules, as cards */
export function GrammarPreview({ modules, locale }: { modules: GrammarIndexEntry[]; locale: SiteLocale }) {
  const g = getCopy(locale).grammar
  return (
    <div className="flex flex-col gap-3">
      {modules.map((m, i) => (
        <div key={m.slug}
          className={cn('flex items-center gap-4 rounded-2xl border border-primary/8 bg-white p-4 dark:border-white/[0.06] dark:bg-[#202638]', i === 1 && 'lg:translate-x-6', i === 2 && 'lg:translate-x-12')}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-black text-indigo-600 dark:text-indigo-300">{m.number}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-bold">{m.title}</p>
              <LevelBadge level={m.level} />
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{m.tagline}</p>
          </div>
          <span className="hidden shrink-0 text-xs font-semibold text-slate-400 sm:block">{g.minutes(m.minutes)}</span>
        </div>
      ))}
    </div>
  )
}

/** One real verb in one tense, as in the conjugation table */
export function VerbPreview({ infinitive, translation, tense, forms }: { infinitive: string; translation: string; tense: string; forms: (string | null)[] }) {
  return (
    <div className="rounded-3xl border border-primary/10 bg-white p-6 shadow-xl shadow-primary/5 dark:border-white/[0.06] dark:bg-[#202638]">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-2xl font-black italic">{infinitive}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{translation}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{tense}</span>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {forms.filter((f): f is string => f !== null).map(form => (
          <li key={form} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold dark:bg-white/[0.04]">
            <Volume2 size={13} className="text-slate-400" />
            {form}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MoreGrid({ locale }: { locale: SiteLocale }) {
  const m = getCopy(locale).home.more
  return (
    <Container>
      <SectionHeading title={m.title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {m.items.map(item => {
          const Icon = MORE_ICONS[item.icon] ?? Star
          return (
            <Card key={item.title}>
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={18} /></div>
              <p className="mb-1 font-bold">{item.title}</p>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
            </Card>
          )
        })}
      </div>
    </Container>
  )
}
