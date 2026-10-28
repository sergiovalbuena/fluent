import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import { MariaChat } from '@/components/marketing/maria-chat'
import { Card, Container, CtaBanner, PageHero, PrimaryButton, SectionHeading } from '@/components/marketing/site-ui'
import { getCopy } from '@/lib/marketing/copy'
import { isSiteLocale, type SiteLocale } from '@/lib/marketing/i18n'
import { siteMetadata } from '@/lib/marketing/metadata'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const c = getCopy(locale).meta
  return siteMetadata(locale, '/maria', c.mariaTitle, c.mariaDescription)
}

export default async function MariaPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as SiteLocale
  const c = getCopy(locale)
  const m = c.maria

  return (
    <>
      <PageHero eyebrow={m.eyebrow} title={m.title} sub={m.sub}>
        <div className="mt-8"><PrimaryButton href="/signup">{c.startFree} →</PrimaryButton></div>
      </PageHero>

      <section className="pb-16 md:pb-20">
        <Container>
          <SectionHeading title={m.demoTitle} center={false} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {m.scripts.map((_, i) => <MariaChat key={i} locale={locale} script={i} />)}
          </div>
        </Container>
      </section>

      <section className="border-y border-primary/5 bg-white/50 py-16 dark:bg-slate-800/10 md:py-20">
        <Container>
          <SectionHeading title={m.capabilitiesTitle} center={false} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {m.capabilities.map(cap => (
              <Card key={cap.title}>
                <p className="mb-1 font-bold">«{cap.title}»</p>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{cap.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <div className="flex flex-col items-start gap-5 rounded-3xl border border-violet-500/15 bg-violet-500/[0.05] p-8 sm:flex-row sm:items-center">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
              <MessageCircle size={22} />
            </div>
            <div>
              <p className="text-xl font-bold">{m.limitTitle}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{m.limitBody}</p>
            </div>
          </div>
        </Container>
      </section>

      <CtaBanner locale={locale} />
    </>
  )
}
