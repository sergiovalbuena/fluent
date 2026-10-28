import type { Metadata } from 'next'
import { VerbExplorer, type VerbCourseTab } from '@/components/marketing/verb-explorer'
import { Card, Container, CtaBanner, PageHero, SectionHeading } from '@/components/marketing/site-ui'
import { getCopy } from '@/lib/marketing/copy'
import { COURSE_FLAGS, getVerbShowcase } from '@/lib/marketing/data'
import { isSiteLocale, type CourseCode, type SiteLocale } from '@/lib/marketing/i18n'
import { siteMetadata } from '@/lib/marketing/metadata'

type Props = { params: Promise<{ locale: string }> }

/** Courses written for this visitor first */
const ORDER: Record<SiteLocale, CourseCode[]> = { es: ['fr', 'en', 'es'], en: ['es', 'fr', 'en'] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const c = getCopy(locale).meta
  return siteMetadata(locale, '/verbs', c.verbsTitle, c.verbsDescription)
}

export default async function VerbsPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as SiteLocale
  const c = getCopy(locale)
  const v = c.verbs

  const showcases = (await Promise.all(ORDER[locale].map(code => getVerbShowcase(code, locale)))).filter(s => s !== null)
  // The full verb lists are rendered here on the server; the explorer only needs the featured verbs
  const tabs: VerbCourseTab[] = showcases.map(s => ({ ...s, all: [], flag: COURSE_FLAGS[s.code] }))

  return (
    <>
      <PageHero eyebrow={v.eyebrow} title={v.title} sub={v.sub} />

      <section className="pb-16 md:pb-20">
        <Container>
          <VerbExplorer locale={locale} courses={tabs} />
        </Container>
      </section>

      <section className="border-y border-primary/5 bg-white/50 py-16 dark:bg-slate-800/10 md:py-20">
        <Container>
          <SectionHeading title={v.practiceTitle} center={false} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {v.practice.map(p => (
              <Card key={p.title}>
                <p className="mb-1 font-bold">{p.title}</p>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container className="flex flex-col gap-4">
          {showcases.map(s => (
            <details key={s.code} className="group rounded-2xl border border-primary/8 bg-white p-5 dark:border-white/[0.06] dark:bg-[#202638]">
              <summary className="flex cursor-pointer list-none items-center gap-3 font-bold">
                <span className="text-xl">{COURSE_FLAGS[s.code]}</span>
                {v.allTitle(s.total, c.courseNames[s.code])}
                <span className="ml-auto text-primary transition-transform group-open:rotate-90">›</span>
              </summary>
              <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {s.all.map(verb => (
                  <li key={verb.infinitive} className="truncate">
                    <span className="font-semibold italic">{verb.infinitive}</span>
                    <span className="text-slate-400"> · {verb.translation}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </Container>
      </section>

      <CtaBanner locale={locale} />
    </>
  )
}
