import { describe, expect, it } from 'vitest'
import { FAKE_PENALTY, estimateLevel, placementWords } from '@/lib/placement'

describe('estimateLevel', () => {
  it('places by share of known words within the band', () => {
    expect(estimateLevel('A', 5, 30)).toBe('A0')    // under 30 %
    expect(estimateLevel('A', 9, 30)).toBe('A1')    // 30 %
    expect(estimateLevel('A', 21, 30)).toBe('A2')   // 70 %
    expect(estimateLevel('B', 30, 30)).toBe('B2')
    expect(estimateLevel('C', 15, 30)).toBe('C1')
  })

  it('each made-up word ticked cancels FAKE_PENALTY known words', () => {
    expect(estimateLevel('B', 21, 30)).toBe('B2')
    expect(estimateLevel('B', 21, 30, 1)).toBe('B1')            // 16 of 30
    expect(estimateLevel('B', 21, 30, 3)).toBe('A2')            // 6 of 30
    expect(estimateLevel('B', 2, 30, 3)).toBe('A2')             // never below zero
    expect(FAKE_PENALTY).toBe(5)
  })

  it('an empty list is the level below the band', () => {
    expect(estimateLevel('A', 0, 0)).toBe('A0')
  })
})

describe('placementWords', () => {
  it.each(['fr', 'en', 'es'])('%s: 30 real words and 3 made-up ones per band, no word in both', lang => {
    for (const band of ['A', 'B', 'C'] as const) {
      const words = placementWords(lang, band)
      const real = words.filter(w => !w.fake).map(w => w.word.toLowerCase())
      const fake = words.filter(w => w.fake).map(w => w.word.toLowerCase())
      expect(real).toHaveLength(30)
      expect(fake).toHaveLength(3)
      expect(fake.filter(w => real.includes(w))).toEqual([])
      expect(new Set(real).size).toBe(real.length)
    }
  })
})
