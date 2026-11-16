import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal/legal-document'
import { CONTACT_EMAIL } from '@/lib/contact'
import { LEGAL_UI, privacyPolicy } from '@/lib/legal/content'
import { legalLocale } from '@/lib/legal/locale'

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${LEGAL_UI[await legalLocale()].privacy} · Fluent` }
}

export default async function PrivacyPolicyPage() {
  const locale = await legalLocale()
  return (
    <LegalDocument
      locale={locale}
      doc={privacyPolicy(locale, CONTACT_EMAIL)}
      icon="🔒"
      related={{ href: '/terms', label: LEGAL_UI[locale].terms }}
    />
  )
}
