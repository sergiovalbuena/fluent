import { describe, expect, it } from 'vitest'
import { applyXpMultipliers, checkAnswer, exerciseReward, gemsLeft, isModuleMastered } from '@/lib/grammar'
import { checkTyped, type QuizQuestion } from '@/lib/verb-quiz'

describe('grammar checkAnswer', () => {
  const item = { answer: "J'ai mangé une pomme.", accept: ["J'ai mangé la pomme"] }

  it('ignores case, final punctuation, extra spaces and the kind of apostrophe', () => {
    expect(checkAnswer("j’ai   mangé une pomme", item)).toBe('correct')
    expect(checkAnswer("J'ai mangé une pomme !", item)).toBe('correct')
  })
  it('accepts the listed alternatives', () => {
    expect(checkAnswer("J'ai mangé la pomme.", item)).toBe('correct')
  })
  it('a missing accent is "almost", not correct', () => {
    expect(checkAnswer("J'ai mange une pomme", item)).toBe('almost')
  })
  it('anything else, or nothing, is wrong', () => {
    expect(checkAnswer("J'ai bu une pomme", item)).toBe('wrong')
    expect(checkAnswer('   ', item)).toBe('wrong')
  })
})

describe('verb quiz checkTyped', () => {
  const q = { answer: 'avons mangé', full: 'nous avons mangé' } as QuizQuestion

  it('accepts the form with or without the subject', () => {
    expect(checkTyped('avons mangé', q)).toBe('correct')
    expect(checkTyped('Nous avons mangé ', q)).toBe('correct')
  })
  it('a missing accent is "almost"', () => {
    expect(checkTyped('avons mange', q)).toBe('almost')
  })
  it('another form is wrong', () => {
    expect(checkTyped('avez mangé', q)).toBe('wrong')
    expect(checkTyped('', q)).toBe('wrong')
  })
})

describe('grammar rewards', () => {
  it('pays by score until the exercise is mastered, gems only on mastering it', () => {
    expect(exerciseReward(undefined, 50, false)).toEqual({ kind: 'first', xp: 5, gems: 0 })
    expect(exerciseReward(40, 60, false)).toEqual({ kind: 'first', xp: 10, gems: 0 })
    expect(exerciseReward(70, 80, false)).toEqual({ kind: 'first', xp: 15, gems: 2 })
  })
  it('a mastered exercise and the mixed review pay practice XP and no gems', () => {
    expect(exerciseReward(80, 100, false)).toEqual({ kind: 'practice', xp: 5, gems: 0 })
    expect(exerciseReward(undefined, 100, true)).toEqual({ kind: 'practice', xp: 5, gems: 0 })
  })
  it('multiplies XP by 1.5 from a 7-day streak and by 2 with the boost', () => {
    expect(applyXpMultipliers(10, { streak: 6, boost: false })).toBe(10)
    expect(applyXpMultipliers(10, { streak: 7, boost: false })).toBe(15)
    expect(applyXpMultipliers(10, { streak: 7, boost: true })).toBe(30)
  })
  it('a module is mastered when every exercise reaches 80', () => {
    expect(isModuleMastered(['a', 'b'], { a: 80, b: 100 })).toBe(true)
    expect(isModuleMastered(['a', 'b'], { a: 80 })).toBe(false)
    expect(isModuleMastered([], {})).toBe(false)
    expect(gemsLeft(['a', 'b'], { a: 80 })).toBe(12)   // one exercise (2) + module bonus (10)
    expect(gemsLeft(['a', 'b'], { a: 80, b: 90 })).toBe(0)
  })
})
