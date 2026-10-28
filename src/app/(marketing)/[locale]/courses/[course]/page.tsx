import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Bot, BookMarked, Info, ListOrdered } from 'lucide-react'
import { ActivityGrid } from '@/components/marketing/home-sections'
import { SpeakButton } from '@/components/marketing/speak-button'
import { Card, Container, CtaBanner, PageHero, PrimaryButton, SectionHeading, StatRow } from '@/components/marketing/site-ui'
import { getCopy, formatNumber } from '@/lib/marketing/copy'
import { getCourseDetail } from '@/lib/marketing/data'
import { COURSE_SLUGS, isCourseSlug, isSiteLocale, SITE_LOCALES, type SiteLocale } from '@/lib/marketing/i18n'
import { siteMetadata } from '@/lib/marketing/metadata'

type Props = { params: Promise<{ locale: string; course: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return SITE_LOCALES.flatMap(locale => Object.keys(COURSE_SLUGS).map(course => ({ locale, course })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, course } = await params
  if (!isSiteLocale(locale) || !isCourseSlug(course)) return {}
  const c = getCopy(locale)
  const code = COURSE_SLUGS[course]
  return siteMetadata(locale, `/courses/${course}`, c.meta.courseTitle(c.courseNames[code]), c.course.intro[code])
}

export default async function CoursePage({ params }: Props) {
  const { locale: raw, course: slug } = await params
  if (!isCourseSlug(slug)) notFound()
  const locale = raw as SiteLocale
  const c = getCopy(locale)
  const k = c.course
  const course = await getCourseDetail(slug, locale)
  const name = c.courseNames[course.code]

  const stats = [
    { value: course.lessons, label: k.stats.lessons },
    { value: course.words, label: k.stats.words },
    { value: course.phrases, label: k.stats.phrases },
    { value: course.questions, label: k.stats.questions },
    ...(course.grammarModules ? [{ value: course.grammarModules, label: k.stats.grammar }] : []),
    { value: course.verbs, label: k.stats.verbs },
  ].map(s => ({ value: formatNumber(locale, s.value), label: s.label }))

  return (
    <>
      <PageHero eyebrow={`${course.flag} ${k.eyebrow}`} title={k.title(name)} sub={k.intro[course.code]}>
        <p className="mt-4 text-sm font-semibold text-slate-400">{c.forLearners(course.learners.map(l => c.learnerNames[l]))}</p>
        {!course.learners.includes(locale) && (
          <p className="mt-5 flex max-w-2xl gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <Info size={16} className="mt-0.5 shrink-0" />
            {k.notForYou}
          </p>
        )}
        <StatRow items={stats} />
        <div className="mt-8"><PrimaryButton href="/signup">{c.startFree} →</PrimaryButton></div>
      </PageHero>

      {/* Lesson 1 sample */}
      <section className="border-y border-primary/5 bg-white/50 py-16 dark:bg-slate-800/10 md:py-20">
        <Container>
          <SectionHeading title={k.sampleTitle(course.sample.title)} sub={k.sampleSub} center={false} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">{k.words}</p>
              <ul className="flex flex-col gap-3">
                {course.sample.words.map(w => (
                  <li key={w.text} className="flex flex-col">
                    <SpeakButton text={w.text} lang={course.code} className="font-bold">{w.text}</SpeakButton>
                    <span className="pl-[22px] text-xs text-slate-500 dark:text-slate-400">{w.translation}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">{k.phrases}</p>
              <ul className="flex flex-col gap-4">
                {course.sample.phrases.map(p => (
                  <li key={p.text} className="flex flex-col">
                    <SpeakButton text={p.text} lang={course.code} className="font-bold">{p.text}</SpeakButton>
                    <span className="pl-[22px] text-xs text-slate-500 dark:text-slate-400">{p.translation}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">{k.story}</p>
              <p className="mb-3 text-lg font-bold">{course.sample.story.title}</p>
              <p className="text-[15px] italic leading-relaxed text-slate-600 dark:text-slate-300">{course.sample.story.excerpt}…</p>
            </Card>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <SectionHeading title={k.activitiesTitle} center={false} />
          <ActivityGrid locale={locale} />
        </Container>
      </section>

      {/* Syllabus */}
      <section className="border-y border-primary/5 bg-white/50 py-16 dark:bg-slate-800/10 md:py-20">
        <Container>
          <SectionHeading title={k.syllabusTitle(course.lessons)} center={false} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {course.units.map((unit, i) => (
              <Card key={unit.title + i} className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{unit.emoji}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.unit(i + 1)}</p>
                    <p className="font-bold">{unit.title}</p>
                  </div>
                </div>
                <ol className="flex flex-col gap-1.5">
                  {unit.lessons.map(l => (
                    <li key={l.number} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-slate-300 dark:text-slate-600">{l.number}</span>
                      <span className="shrink-0">{l.icon}</span>
                      <span className="truncate">{l.title}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Grammar, verbs, MarIA */}
      <section className="py-16 md:py-20">
        <Container>
          <SectionHeading title={k.extrasTitle} center={false} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ...(course.grammarModules ? [{ href: `/${locale}/grammar?course=${course.code}`, icon: BookMarked, label: k.grammarCard(course.grammarModules) }] : []),
              { href: `/${locale}/verbs?course=${course.code}`, icon: ListOrdered, label: k.verbsCard(course.verbs) },
              { href: `/${locale}/maria`, icon: Bot, label: k.mariaCard },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="group flex items-center gap-4 rounded-2xl border border-primary/8 bg-white p-5 transition-colors hover:border-primary/30 dark:border-white/[0.06] dark:bg-[#202638]">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon size={19} /></div>
                <span className="flex-1 font-bold">{item.label}</span>
                <span className="text-primary transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <CtaBanner locale={locale} />
    </>
  )
}
