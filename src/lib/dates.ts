// "Today" is the learner's local day, not the server's or UTC's: the streak, the
// daily goal and the activity charts all go by it. The browser sends its time zone
// with each activity (record_activity stores it in user_profiles.timezone), and
// server pages read it back from there.

/** The browser's IANA time zone ("America/Mexico_City"), or null when unknown */
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/** The date in a time zone as YYYY-MM-DD (UTC when the zone is missing or unknown) */
export function dateIn(timeZone: string | null | undefined, at: Date = new Date()): string {
  try {
    // en-CA formats dates as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}

/** Calendar arithmetic on YYYY-MM-DD keys */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = Monday … 6 = Sunday */
export const weekdayIndex = (dateKey: string): number => (new Date(dateKey + 'T00:00:00Z').getUTCDay() + 6) % 7
