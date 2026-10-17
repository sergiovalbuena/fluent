import Link from 'next/link'

/** Contact for privacy and legal requests — confirm the real address before launch (see docs/HANDOFF.md) */
export const LEGAL_CONTACT = 'privacy@fluent.app'

export type LegalSection = { title: string; content: string }

/** Shared layout for /privacy-policy and /terms */
export function LegalDocument({ title, icon, intro, updated, sections, related }: {
  title: string
  icon: string
  intro: string
  updated: string
  sections: LegalSection[]
  related: { href: string; label: string }
}) {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{icon}</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {intro}{' '}
              Last updated: <span className="font-medium text-foreground">{updated}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
          {sections.map(section => (
            <section key={section.title} className="px-5 py-4">
              <h2 className="font-bold text-sm mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Questions? Email us at{' '}
          <a href={`mailto:${LEGAL_CONTACT}`} className="text-primary hover:underline">{LEGAL_CONTACT}</a>
          {' · '}
          <Link href={related.href} className="text-primary hover:underline">{related.label}</Link>
        </p>
      </div>
    </main>
  )
}
