import type { Metadata } from 'next'
import type { AbstractIntlMessages } from 'next-intl'
import { GrammarBrowser, type GrammarCourseTab } from '@/components/marketing/grammar-browser'
import { LevelBadge } from '@/components/marketing/level-badge'
import { CheckList, Container, CtaBanner, PageHero } from '@/components/marketing/site-ui'
import { getCopy } from '@/lib/marketing/copy'
import { COURSE_FLAGS, getGrammarShowcase, GRAMMAR_COURSES } from '@/lib/marketing/data'
import { isSiteLocale, type SiteLocale } from '@/lib/marketing/i18n'
import { siteMetadata } from '@/lib/marketing/metadata'
import enMessages from '../../../../../messages/en.json'
import esMessages from '../../../../../messages/es.json'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const c = getCopy(locale).meta
  return siteMetadata(locale, '/grammar', c.grammarTitle, c.grammarDescription)
}

// Only the namespace the grammar blocks read goes to the client
const GRAMMAR_MESSAGES: Record<SiteLocale, AbstractIntlMessages> = {
  en: { grammar: enMessages.grammar },
  es: { grammar: esMessages.grammar },
}

export default async function GrammarPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as SiteLocale
  const g = getCopy(locale).grammar

  // The course written for this visitor first
  const order = locale === 'es' ? GRAMMAR_COURSES : [...GRAMMAR_COURSES].reverse()
  const showcases = await Promise.all(order.map(code => getGrammarShowcase(code, locale)))
  const courses: GrammarCourseTab[] = showcases
    .filter(s => s !== null)
    // The Spanish course's explanations are in English (it's for English speakers)
    .map(s => ({ ...s, flag: COURSE_FLAGS[s.code], explanation: s.code === 'es' ? 'en' : locale }))

  const levels = [...new Set(courses.flatMap(x => x.index.modules.map(m => m.level)))].sort()

  return (
    <>
      <PageHero eyebrow={g.eyebrow} title={g.title} sub={g.sub}>
        <ul className="mt-8 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
          {levels.map(level => (
            <li key={level} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <LevelBadge level={level} className="w-8 text-center" />
              {g.levels[level]}
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="pb-16 md:pb-20">
        <Container>
          <GrammarBrowser locale={locale} courses={courses} messages={GRAMMAR_MESSAGES} />
        </Container>
      </section>

      <section className="border-t border-primary/5 bg-white/50 py-16 dark:bg-slate-800/10 md:py-20">
        <Container className="max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold">{g.insideTitle}</h2>
          <CheckList items={g.inside} />
        </Container>
      </section>

      <CtaBanner locale={locale} />
    </>
  )
}
