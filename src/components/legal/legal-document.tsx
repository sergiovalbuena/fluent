import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/contact'
import { LEGAL_UI, type LegalDoc, type LegalLocale } from '@/lib/legal/content'

/** Shared layout for /privacy-policy and /terms */
export function LegalDocument({ locale, doc, icon, related }: {
  locale: LegalLocale
  doc: LegalDoc
  icon: string
  related: { href: string; label: string }
}) {
  const ui = LEGAL_UI[locale]
  return (
    <main className="flex-1 p-4 md:p-8" lang={locale}>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">{doc.title}</h1>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{icon}</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {doc.intro}{' '}
              {ui.updated} <span className="font-medium text-foreground">{doc.updated}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
          {doc.sections.map(section => (
            <section key={section.title} className="px-5 py-4">
              <h2 className="font-bold text-sm mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          {CONTACT_EMAIL && (
            <>
              {ui.questions}{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
              {' · '}
            </>
          )}
          <Link href={related.href} className="text-primary hover:underline">{related.label}</Link>
        </p>
      </div>
    </main>
  )
}
