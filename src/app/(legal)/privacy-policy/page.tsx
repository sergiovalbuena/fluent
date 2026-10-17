import type { Metadata } from 'next'
import { LEGAL_CONTACT, LegalDocument, type LegalSection } from '@/components/legal/legal-document'

export const metadata: Metadata = { title: 'Privacy Policy · Fluent' }

const sections: LegalSection[] = [
  {
    title: '1. Information we collect',
    content: `We only collect what we need to run Fluent:

• Account data: your email address and display name. If you sign in with Google, we receive your name, email and profile picture from Google. We never see your Google password.
• Learning settings: your native language, the language you are learning, the language of the app, your motivation, daily goal and reminder time.
• Progress: lessons and activities completed, scores, stars, XP, gems, streaks, purchases made with gems, and words you have mastered.
• Content you add: study links you save and the messages you send to MarIA, the AI tutor.
• Technical data: the information your browser sends with each request (such as browser type and IP address), used to keep the service running and secure.`,
  },
  {
    title: '2. How we use it',
    content: `We use your information to:

• Run your account and keep you signed in
• Show your progress, award XP, gems and stars, and keep your streak
• Personalize lessons, translations and the language of the app
• Answer your questions to MarIA and read text aloud with AI voices
• Fix problems, prevent abuse and improve Fluent

We do not use your data for advertising and we do not sell it.`,
  },
  {
    title: '3. Service providers',
    content: `Fluent relies on a few providers that process data on our behalf, only to provide the service:

• Supabase: database, authentication and file storage
• Vercel: hosting of the app
• Google: sign-in, if you choose "Continue with Google"
• OpenAI: generates MarIA's answers and AI voice audio. Messages you send to MarIA are sent to OpenAI to produce a reply. Text read aloud is sent to create the audio; that text comes from the course, not from your account.
• YouTube, TikTok and Instagram: previews and players for study links you save. When you play one, that platform may collect data under its own policy.

Audio generated from course content is stored in a public cache so it loads faster. It contains only course text, never personal data.`,
  },
  {
    title: '4. Sharing',
    content: `We do not sell, rent or trade your personal information. Besides the providers above, we only share information if the law requires it, to protect the safety and rights of our users, or as part of a merger or acquisition (in which case we will tell you first).`,
  },
  {
    title: '5. Cookies and local storage',
    content: `We use cookies that are strictly necessary to keep you signed in. Your browser also stores a few preferences on your device (such as the theme, title hints and game settings). We do not use advertising or third-party tracking cookies.`,
  },
  {
    title: '6. How long we keep data',
    content: `We keep your data while your account is active. If you ask us to delete your account, we delete your personal data within 30 days, unless the law requires us to keep something longer.`,
  },
  {
    title: '7. Security',
    content: `Data is encrypted in transit (HTTPS). Access to the database is restricted with row-level security, so each user can only read and change their own data. No system is completely secure, but we work to protect your information and will notify you of any breach that affects you as required by law.`,
  },
  {
    title: '8. Your rights',
    content: `You can ask us to:

• Access a copy of your data
• Correct inaccurate data
• Delete your account and data
• Export your data in a common format
• Object to or restrict some processing

Write to ${LEGAL_CONTACT}. We answer within 30 days. If you live in the EU, the UK or another region with data-protection laws, you can also complain to your local authority.`,
  },
  {
    title: '9. Children',
    content: `Fluent is not intended for children under 13 (or the minimum age in your country). We do not knowingly collect their data, and we delete it if we learn that we have.`,
  },
  {
    title: '10. Changes',
    content: `If we change this policy in a meaningful way, we will tell you in the app before the change takes effect. The date at the top shows the latest version.`,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      icon="🔒"
      intro="This policy explains, in plain words, what Fluent collects, why, and what you can do about it."
      updated="October 17, 2026"
      sections={sections}
      related={{ href: '/terms', label: 'Terms of Service' }}
    />
  )
}
