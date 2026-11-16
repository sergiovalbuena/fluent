import { describe, expect, it } from 'vitest'
import { FREE_LESSONS, lessonStates } from '@/lib/course-path'

const course = (done: number, total = 15) =>
  Array.from({ length: total }, (_, i) => ({ id: `m${i + 1}`, lessonsCompleted: i < done ? 6 : 0, totalLessons: 6 }))

describe('lessonStates', () => {
  it('the first FREE_LESSONS lessons are open from the start, the rest locked', () => {
    const states = lessonStates(course(0), new Set())
    expect(states[0]).toBe('current')
    expect(states.slice(1, FREE_LESSONS).every(s => s === 'available')).toBe(true)
    expect(states.slice(FREE_LESSONS).every(s => s === 'locked')).toBe(true)
  })

  it('beyond the free lessons, only the current lesson and the next one open', () => {
    const states = lessonStates(course(11), new Set())
    expect(states.slice(0, 11).every(s => s === 'completed')).toBe(true)
    expect(states[11]).toBe('current')
    expect(states[12]).toBe('available')
    expect(states[13]).toBe('locked')
  })

  it('a lesson unlocked with gems is open', () => {
    expect(lessonStates(course(0), new Set(['m14']))[13]).toBe('available')
  })

  it('a lesson with no activities is never completed', () => {
    expect(lessonStates([{ id: 'x', lessonsCompleted: 0, totalLessons: 0 }], new Set())).toEqual(['current'])
  })
})
