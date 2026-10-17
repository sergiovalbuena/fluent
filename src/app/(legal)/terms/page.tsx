import type { Metadata } from 'next'
import { LEGAL_CONTACT, LegalDocument, type LegalSection } from '@/components/legal/legal-document'

export const metadata: Metadata = { title: 'Terms of Service · Fluent' }

const sections: LegalSection[] = [
  {
    title: '1. Agreement',
    content: `By creating an account or using Fluent you agree to these terms and to our Privacy Policy. If you do not agree, please do not use Fluent.`,
  },
  {
    title: '2. Your account',
    content: `You need an account to use Fluent. You must be at least 13 years old (or the minimum age in your country). Give accurate information, keep your sign-in details safe and tell us if you think someone else is using your account. You are responsible for what happens in your account.`,
  },
  {
    title: '3. Using Fluent',
    content: `You may use Fluent for your own personal language learning. You agree not to:

• Copy, resell or redistribute the lessons, audio or other content
• Scrape the service or access it with bots
• Try to break, overload or get around the security of the service
• Manipulate XP, gems, streaks or other rewards through bugs or automation
• Use MarIA or any other feature to create illegal, harmful or abusive content`,
  },
  {
    title: '4. Gems, XP and rewards',
    content: `Gems, XP, stars, streaks and boosts are virtual rewards for learning. They have no monetary value, cannot be bought with or exchanged for money, and cannot be transferred to other accounts. We may change how they are earned or spent, and we may correct balances affected by errors or abuse.`,
  },
  {
    title: '5. AI features',
    content: `MarIA (the AI tutor) and the AI voices are generated automatically. They can make mistakes, including in grammar, pronunciation or facts. Use them as a learning aid, not as an authoritative source.`,
  },
  {
    title: '6. Your content',
    content: `You keep ownership of what you add to Fluent, such as saved study links and messages to MarIA. You give us permission to store and process it only to provide the service to you. Do not add content you do not have the right to share.`,
  },
  {
    title: '7. Our content',
    content: `Lessons, stories, audio, design and software in Fluent belong to Fluent or its licensors and are protected by law. Content from third-party platforms (such as YouTube videos you link) belongs to its owners.`,
  },
  {
    title: '8. Availability and changes',
    content: `Fluent is under active development. We may add, change or remove features, and the service may sometimes be unavailable. We will try to give notice of important changes.`,
  },
  {
    title: '9. Ending your account',
    content: `You can stop using Fluent and ask us to delete your account at any time. We may suspend or close accounts that seriously or repeatedly break these terms.`,
  },
  {
    title: '10. Disclaimers and liability',
    content: `Fluent is provided "as is". We do not promise that it will be error-free or that you will reach a particular level in a language. To the extent the law allows, we are not liable for indirect or consequential losses, or for loss of data, rewards or progress. Nothing in these terms limits rights you have under consumer law that cannot be waived.`,
  },
  {
    title: '11. Changes to these terms',
    content: `We may update these terms. If a change is significant, we will tell you in the app before it takes effect. If you keep using Fluent after that, the new terms apply.`,
  },
  {
    title: '12. Contact',
    content: `Questions about these terms: ${LEGAL_CONTACT}`,
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      icon="📄"
      intro="The rules for using Fluent, written to be read. By using Fluent you accept them."
      updated="October 17, 2026"
      sections={sections}
      related={{ href: '/privacy-policy', label: 'Privacy Policy' }}
    />
  )
}
