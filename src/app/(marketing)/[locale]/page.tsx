import type { Metadata } from 'next'
import { HomeHero } from '@/components/marketing/home-hero'
import { QaDemo, StatsBand } from '@/components/marketing/home-widgets'
import { MariaChat } from '@/components/marketing/maria-chat'
import {
  ActivityGrid, CourseCards, GrammarPreview, MoreGrid, Showcase, VerbPreview,
} from '@/components/marketing/home-sections'
import { Container, CtaBanner, SectionHeading } from '@/components/marketing/site-ui'
import { getCopy } from '@/lib/marketing/copy'
import { getAllCourseSummaries, getGrammarShowcase, getSiteTotals, getVerbShowcase } from '@/lib/marketing/data'
import { isSiteLocale, type CourseCode, type SiteLocale } from '@/lib/marketing/i18n'
import { siteMetadata } from '@/lib/marketing/metadata'
import type { GrammarIndexEntry } from '@/lib/grammar'

type Props = { params: Promise<{ locale: string }> }

/** The course a visitor most likely wants: French for Spanish speakers, Spanish for English speakers */
const FEATURED_COURSE: Record<SiteLocale, CourseCode> = { es: 'fr', en: 'es' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const c = getCopy(locale).meta
  return siteMetadata(locale, '', c.homeTitle, c.homeDescription)
}

/** One module per level, so the preview shows the range */
function levelSpread(modules: GrammarIndexEntry[], count: number): GrammarIndexEntry[] {
  const seen = new Set<string>()
  return modules.filter(m => !seen.has(m.level) && seen.add(m.level)).slice(0, count)
}

export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as SiteLocale
  const c = getCopy(locale)
  const s = c.home.showcase
  const featured = FEATURED_COURSE[locale]

  const [courses, totals, grammar, verbs] = await Promise.all([
    getAllCourseSummaries(),
    getSiteTotals(),
    getGrammarShowcase(featured, locale),
    getVerbShowcase(featured, locale),
  ])
  const verb = verbs?.featured[0]
  const tense = verbs?.moods[0].tenses[0]

  return (
    <>
      <HomeHero locale={locale} />
      <StatsBand locale={locale} totals={totals} />

      <section id="courses" className="scroll-mt-20 py-20 md:py-28">
        <Container>
          <SectionHeading eyebrow={c.home.courses.eyebrow} title={c.home.courses.title} sub={c.home.courses.sub} />
          <CourseCards locale={locale} courses={courses} />
        </Container>
      </section>

      <section className="border-y border-primary/5 bg-white/50 py-20 dark:bg-slate-800/10 md:py-28">
        <Container>
          <SectionHeading eyebrow={c.home.lesson.eyebrow} title={c.home.lesson.title} sub={c.home.lesson.sub} />
          <ActivityGrid locale={locale} />
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container className="flex flex-col gap-24 md:gap-32">
          <Showcase {...s.grammar} link={{ href: `/${locale}/grammar`, label: s.grammar.link }}>
            {grammar && <GrammarPreview locale={locale} modules={levelSpread(grammar.index.modules, 3)} />}
          </Showcase>

          <Showcase {...s.verbs} link={{ href: `/${locale}/verbs`, label: s.verbs.link }} flip>
            {verb && tense && (
              <VerbPreview infinitive={verb.infinitive} translation={verb.translation} tense={tense.name} forms={verb.forms[tense.key] ?? []} />
            )}
          </Showcase>

          <Showcase {...s.maria} link={{ href: `/${locale}/maria`, label: s.maria.link }}>
            <MariaChat locale={locale} />
          </Showcase>

          <Showcase eyebrow={s.audio.eyebrow} title={s.audio.title} body={s.audio.body} flip>
            <QaDemo locale={locale} />
          </Showcase>
        </Container>
      </section>

      <section className="border-t border-primary/5 bg-white/50 py-20 dark:bg-slate-800/10 md:py-28">
        <MoreGrid locale={locale} />
      </section>

      <CtaBanner locale={locale} />
    </>
  )
}
