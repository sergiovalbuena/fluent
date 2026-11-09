// Lesson states on the course path, shared by /learn, the dashboard and the lesson
// guard. The first lesson not completed is the current one; the one after it is open
// too, and so are the first FREE_LESSONS lessons and any lesson unlocked early with gems.

export type LessonState = 'completed' | 'current' | 'available' | 'locked'

/** Lessons open to everyone from the start, in every course */
export const FREE_LESSONS = 10

/** Accounts with every lesson open (the owner's) */
const ALL_LESSONS_OPEN = new Set(['3c8a6d64-5446-4acb-936a-8347b2ed0344'])

export function lessonStates(
  lessons: { id: string; lessonsCompleted: number; totalLessons: number }[],
  unlockedIds: Set<string>,
  userId: string | null = null,
): LessonState[] {
  const isDone = (m: { lessonsCompleted: number; totalLessons: number }) => m.totalLessons > 0 && m.lessonsCompleted >= m.totalLessons
  const allOpen = userId !== null && ALL_LESSONS_OPEN.has(userId)
  // Lessons unlocked with gems may be completed out of order, so this can't be "after the last completed"
  const currentIdx = lessons.findIndex(m => !isDone(m))
  return lessons.map((m, i) => {
    if (isDone(m)) return 'completed'
    if (i === currentIdx) return 'current'
    if (i === currentIdx + 1 || i < FREE_LESSONS || allOpen) return 'available'
    return unlockedIds.has(m.id) ? 'available' : 'locked'
  })
}
