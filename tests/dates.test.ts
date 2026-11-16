import { describe, expect, it } from 'vitest'
import { addDays, dateIn, weekdayIndex } from '@/lib/dates'

describe('dateIn', () => {
  // 03:00 UTC on Nov 16 is still the evening of Nov 15 in the Americas
  const at = new Date('2026-11-16T03:00:00Z')

  it('gives the local day of the time zone', () => {
    expect(dateIn('UTC', at)).toBe('2026-11-16')
    expect(dateIn('America/Mexico_City', at)).toBe('2026-11-15')
    expect(dateIn('America/Los_Angeles', at)).toBe('2026-11-15')
    expect(dateIn('Europe/Madrid', at)).toBe('2026-11-16')
    expect(dateIn('Asia/Tokyo', at)).toBe('2026-11-16')
  })
  it('falls back to UTC without a time zone or with an unknown one', () => {
    expect(dateIn(null, at)).toBe('2026-11-16')
    expect(dateIn('Not/AZone', at)).toBe('2026-11-16')
  })
})

describe('date keys', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
  it('weeks start on Monday', () => {
    expect(weekdayIndex('2026-11-16')).toBe(0)   // Monday
    expect(weekdayIndex('2026-11-15')).toBe(6)   // Sunday
  })
})
