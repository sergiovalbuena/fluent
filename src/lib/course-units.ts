// Thematic units that group a course's modules on the learning path.
// Titles are in the course language, with translations keyed by language.
// Courses without an entry are split into generic units of UNIT_SIZE modules.

export type CourseUnit = {
  /** 1-based module positions (order on the path), inclusive */
  from: number
  to: number
  title: string
  translations: Record<string, string>
  emoji: string
}

export const UNIT_SIZE = 10

const COURSE_UNITS: Record<string, CourseUnit[]> = {
  fr: [
    { from: 1,  to: 10, emoji: '🌱', title: 'Les premiers pas',          translations: { en: 'First steps',               es: 'Los primeros pasos' } },
    { from: 11, to: 20, emoji: '🧭', title: 'Le monde autour de moi',    translations: { en: 'The world around me',       es: 'El mundo que me rodea' } },
    { from: 21, to: 30, emoji: '🎭', title: 'Loisirs et sorties',        translations: { en: 'Free time and outings',     es: 'Ocio y salidas' } },
    { from: 31, to: 40, emoji: '🧳', title: 'En voyage',                 translations: { en: 'Travelling',                es: 'De viaje' } },
    { from: 41, to: 50, emoji: '🏡', title: 'S\'installer en France',    translations: { en: 'Settling in France',        es: 'Instalarse en Francia' } },
    { from: 51, to: 60, emoji: '☀️', title: 'La vie de tous les jours',  translations: { en: 'Everyday life',             es: 'La vida cotidiana' } },
  ],
}

/** Units covering `count` modules of the given course */
export function getCourseUnits(languageCode: string, count: number): CourseUnit[] {
  const defined = (COURSE_UNITS[languageCode] ?? []).filter(u => u.from <= count)
  const units = defined.map(u => ({ ...u, to: Math.min(u.to, count) }))
  // Modules past the defined units (or a course without units) get generic ones
  let next = (units.at(-1)?.to ?? 0) + 1
  while (next <= count) {
    const to = Math.min(next + UNIT_SIZE - 1, count)
    units.push({ from: next, to, title: '', translations: {}, emoji: '📘' })
    next = to + 1
  }
  return units
}
