import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal/legal-document'
import { CONTACT_EMAIL } from '@/lib/contact'
import { LEGAL_UI, termsOfService } from '@/lib/legal/content'
import { legalLocale } from '@/lib/legal/locale'

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${LEGAL_UI[await legalLocale()].terms} · Fluent` }
}

export default async function TermsPage() {
  const locale = await legalLocale()
  return (
    <LegalDocument
      locale={locale}
      doc={termsOfService(locale, CONTACT_EMAIL)}
      icon="📄"
      related={{ href: '/privacy-policy', label: LEGAL_UI[locale].privacy }}
    />
  )
}
