// Lesson states on the course path, shared by /learn and the dashboard.
// The first lesson not completed is the current one; the one after it is open
// too, and so is any lesson unlocked early with gems.

export type LessonState = 'completed' | 'current' | 'available' | 'locked'

export function lessonStates(
  lessons: { id: string; lessonsCompleted: number; totalLessons: number }[],
  unlockedIds: Set<string>,
): LessonState[] {
  const isDone = (m: { lessonsCompleted: number; totalLessons: number }) => m.totalLessons > 0 && m.lessonsCompleted >= m.totalLessons
  // Lessons unlocked with gems may be completed out of order, so this can't be "after the last completed"
  const currentIdx = lessons.findIndex(m => !isDone(m))
  return lessons.map((m, i) => {
    if (isDone(m)) return 'completed'
    if (i === currentIdx) return 'current'
    if (i === currentIdx + 1) return 'available'
    return unlockedIds.has(m.id) ? 'available' : 'locked'
  })
}
