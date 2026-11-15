// Lesson states on the course path, shared by /learn, the dashboard and the lesson
// guard. The first lesson not completed is the current one; the one after it is open
// too, and so are the first FREE_LESSONS lessons and any lesson unlocked early with gems.

import { isOwner } from '@/lib/owner'

export type LessonState = 'completed' | 'current' | 'available' | 'locked'

/** Lessons open to everyone from the start, in every course */
export const FREE_LESSONS = 10

export function lessonStates(
  lessons: { id: string; lessonsCompleted: number; totalLessons: number }[],
  unlockedIds: Set<string>,
  userId: string | null = null,
): LessonState[] {
  const isDone = (m: { lessonsCompleted: number; totalLessons: number }) => m.totalLessons > 0 && m.lessonsCompleted >= m.totalLessons
  const allOpen = isOwner(userId)
  // Lessons unlocked with gems may be completed out of order, so this can't be "after the last completed"
  const currentIdx = lessons.findIndex(m => !isDone(m))
  return lessons.map((m, i) => {
    if (isDone(m)) return 'completed'
    if (i === currentIdx) return 'current'
    if (i === currentIdx + 1 || i < FREE_LESSONS || allOpen) return 'available'
    return unlockedIds.has(m.id) ? 'available' : 'locked'
  })
}
