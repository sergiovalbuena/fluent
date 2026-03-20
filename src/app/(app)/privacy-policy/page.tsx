import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const sections = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us when you create an account, complete onboarding, or use our services. This includes:

• Account information: display name, email address, and password (or OAuth token if you sign in with Google)
• Learning preferences: native language, target language, learning motivation, daily goal, and reminder settings
• Usage data: lessons completed, XP earned, streak count, quiz scores, and session timestamps
• Device information: browser type, operating system, and general location (country-level only)`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

• Provide, maintain, and improve our language learning services
• Personalize your learning experience and recommend lessons
• Track your progress, maintain streaks, and calculate XP
• Send reminder notifications at the time you specify
• Respond to your comments, questions, and support requests
• Monitor and analyze trends and usage to improve the app`,
  },
  {
    title: '3. Information Sharing',
    content: `We do not sell, trade, or rent your personal information to third parties. We may share information in the following limited circumstances:

• Service providers: We share data with vendors who help us operate the platform (e.g. Supabase for database hosting)
• Legal requirements: We may disclose information if required by law or to protect the rights and safety of our users
• Business transfers: If we merge or are acquired, your information may be transferred as part of that transaction — we will notify you beforehand`,
  },
  {
    title: '4. Data Retention',
    content: `We retain your personal information for as long as your account is active or as needed to provide services. You can delete your account at any time by contacting us. Upon deletion, we remove your personal data within 30 days, except where retention is required by law.`,
  },
  {
    title: '5. Cookies and Tracking',
    content: `We use cookies and similar tracking technologies to maintain your session and remember your preferences (such as theme and language). We do not use third-party advertising cookies. You can control cookie settings through your browser, though disabling cookies may affect app functionality.`,
  },
  {
    title: '6. Security',
    content: `We take reasonable technical and organizational measures to protect your information against unauthorized access, alteration, or destruction. All data is encrypted in transit (HTTPS) and at rest. However, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: '7. Children\'s Privacy',
    content: `Fluent is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly.`,
  },
  {
    title: '8. Your Rights',
    content: `Depending on your location, you may have rights regarding your personal data, including:

• Access: Request a copy of the data we hold about you
• Correction: Request that we correct inaccurate data
• Deletion: Request that we delete your account and associated data
• Portability: Request an export of your data in a common format

To exercise these rights, contact us at privacy@fluent.app.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice in the app or sending an email. Your continued use of Fluent after changes take effect constitutes your acceptance of the revised policy.`,
  },
  {
    title: '10. Contact Us',
    content: `If you have any questions about this Privacy Policy or our data practices, please contact us at:

Email: privacy@fluent.app
Address: Fluent Inc., 123 Language St., San Francisco, CA 94103`,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 md:px-8 py-4 md:py-5 sticky top-0 z-10 border-b border-primary/10 bg-[#f8f6f5] dark:bg-[#23140f]">
        <Link href="/profile" className="size-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors">
          <ChevronLeft size={18} className="text-muted-foreground" />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold">Privacy Policy</h1>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Intro card */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🔒</span>
              <div>
                <h2 className="font-bold text-sm mb-1">Your privacy matters</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This policy explains how Fluent collects, uses, and protects your personal information.
                  Last updated: <span className="font-medium text-foreground">March 18, 2026</span>
                </p>
              </div>
            </div>
          </div>

          {/* Policy sections */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/5 divide-y divide-primary/5 overflow-hidden">
            {sections.map(section => (
              <div key={section.title} className="px-5 py-4">
                <h3 className="font-bold text-sm mb-2">{section.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground pb-4">
            Questions? Email us at{' '}
            <a href="mailto:privacy@fluent.app" className="text-primary hover:underline">
              privacy@fluent.app
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
