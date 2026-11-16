import { track } from '@vercel/analytics'

// The product funnel, as custom events in Vercel Web Analytics. Keep the list
// short: each event answers one question about sign-up, activation or retention.
// (Returning users and lessons per day come from user_activity in the database.)
type Events = {
  /** Sign-up form sent or Google button pressed */
  signup_started: { method: 'email' | 'google' | 'guest' }
  /** Onboarding finished: the account has a course */
  onboarding_completed: { course: string; level: string }
  /** A lesson activity finished and saved (activation = the first one) */
  activity_completed: { course: string; activity: string; first: boolean }
  /** A mini-game round that paid rewards */
  minigame_completed: { game: string }
  account_deleted: Record<string, never>
}

/** Never throws: analytics must not break the action being measured */
export function trackEvent<K extends keyof Events>(name: K, props: Events[K]) {
  try {
    track(name, props)
  } catch {
    // ad blockers, SSR
  }
}
