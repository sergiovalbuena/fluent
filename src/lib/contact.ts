/**
 * The one address shown for support, privacy and legal requests (help center,
 * privacy policy, terms). Set NEXT_PUBLIC_CONTACT_EMAIL to a mailbox that is
 * really read; while it's empty, pages point to the in-app options instead of
 * showing an address nobody answers.
 */
export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null
