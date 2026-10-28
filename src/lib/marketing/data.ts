import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getCourseUnits } from '@/lib/course-units'
import { loadGrammarIndex, loadGrammarModule, type GrammarIndex, type GrammarSection } from '@/lib/grammar'
import { loadVerbIndex, loadVerbForms, loadVerbExamples, verbTranslation, type VerbForms } from '@/lib/verbs'
import { COURSE_SLUGS, courseSlugFor, type CourseCode, type CourseSlug, type SiteLocale } from './i18n'

// Numbers and samples for the marketing pages, read from the real course
// content at build time (the pages are static), so they never go stale.

export const COURSE_CODES: CourseCode[] = ['fr', 'en', 'es']

/** Which native languages each course is written for */
export const COURSE_LEARNERS: Record<CourseCode, SiteLocale[]> = { fr: ['es', 'en'], en: ['es'], es: ['en'] }

export const COURSE_FLAGS: Record<CourseCode, string> = { fr: '🇫🇷', en: '🇺🇸', es: '🇪🇸' }

type Translated = Record<string, string | undefined>
type LessonFile = {
  lesson: number
  icon: string
  title: Translated
  vocabulary: ({ word: string } & Translated)[]
  phrases: ({ phrase: string } & Translated)[]
  qa: unknown[]
  story: { title: string; text: string }
}

const lessonCache = new Map<CourseCode, LessonFile[]>()

function readLessons(code: CourseCode): LessonFile[] {
  const cached = lessonCache.get(code)
  if (cached) return cached
  const dir = path.join(process.cwd(), 'content', code)
  const lessons = readdirSync(dir)
    .filter(f => /^(lecon|lesson|leccion)-\d+\.json$/.test(f))
    .sort()
    .map(f => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as LessonFile)
  lessonCache.set(code, lessons)
  return lessons
}

/** The translation a visitor reads: their locale when the content has it, else whatever there is */
function pick(item: Translated, locale: SiteLocale, exclude: string): string {
  return item[locale] ?? Object.entries(item).find(([k, v]) => k !== exclude && typeof v === 'string' && k !== 'word' && k !== 'phrase')?.[1] ?? ''
}

export type CourseSummary = {
  code: CourseCode
  slug: CourseSlug
  flag: string
  learners: SiteLocale[]
  lessons: number
  words: number
  phrases: number
  questions: number
  grammarModules: number
  verbs: number
}

export async function getCourseSummary(code: CourseCode): Promise<CourseSummary> {
  const lessons = readLessons(code)
  const [grammar, verbs] = await Promise.all([loadGrammarIndex(code, 'en'), loadVerbIndex(code)])
  return {
    code,
    slug: courseSlugFor(code),
    flag: COURSE_FLAGS[code],
    learners: COURSE_LEARNERS[code],
    lessons: lessons.length,
    words: lessons.reduce((n, l) => n + l.vocabulary.length, 0),
    phrases: lessons.reduce((n, l) => n + l.phrases.length, 0),
    questions: lessons.reduce((n, l) => n + l.qa.length, 0),
    grammarModules: grammar?.modules.length ?? 0,
    verbs: verbs?.verbs.length ?? 0,
  }
}

export const getAllCourseSummaries = () => Promise.all(COURSE_CODES.map(getCourseSummary))

export type SiteTotals = { lessons: number; grammarModules: number; verbs: number; audioClips: number }

export async function getSiteTotals(): Promise<SiteTotals> {
  const courses = await getAllCourseSummaries()
  const sum = (key: 'lessons' | 'grammarModules' | 'verbs' | 'words' | 'phrases') => courses.reduce((n, c) => n + c[key], 0)
  return {
    lessons: sum('lessons'),
    grammarModules: sum('grammarModules'),
    verbs: sum('verbs'),
    // Every word and phrase has a pregenerated native-voice clip
    audioClips: sum('words') + sum('phrases'),
  }
}

export type CourseDetail = CourseSummary & {
  units: { emoji: string; title: string; lessons: { number: number; icon: string; title: string }[] }[]
  sample: {
    title: string
    words: { text: string; translation: string }[]
    phrases: { text: string; translation: string }[]
    story: { title: string; excerpt: string }
  }
}

export async function getCourseDetail(slug: CourseSlug, locale: SiteLocale): Promise<CourseDetail> {
  const code = COURSE_SLUGS[slug]
  const lessons = readLessons(code)
  const summary = await getCourseSummary(code)
  const titleOf = (l: LessonFile) => l.title[locale] ?? l.title[code] ?? ''

  const units = getCourseUnits(code, lessons.length).map(u => ({
    emoji: u.emoji,
    title: u.translations[locale] ?? u.title,
    lessons: lessons.slice(u.from - 1, u.to).map(l => ({ number: l.lesson, icon: l.icon, title: titleOf(l) })),
  }))

  const first = lessons[0]
  const sentences = first.story.text.match(/[^.!?]+[.!?]+/g) ?? [first.story.text]
  return {
    ...summary,
    units,
    sample: {
      title: titleOf(first),
      words: first.vocabulary.slice(0, 8).map(v => ({ text: v.word, translation: pick(v, locale, code) })),
      phrases: first.phrases.slice(0, 4).map(p => ({ text: p.phrase, translation: pick(p, locale, code) })),
      story: { title: first.story.title, excerpt: sentences.slice(0, 4).join('').trim() },
    },
  }
}

// ── Grammar ───────────────────────────────────────────────────────────────────

/** Courses with grammar modules, and the explanation language a visitor reads */
export const GRAMMAR_COURSES: CourseCode[] = ['fr', 'es']

export type GrammarShowcase = {
  code: CourseCode
  index: GrammarIndex
  /** One real section of a module, shown in full */
  sample: { moduleTitle: string; level: string; section: GrammarSection }
}

const GRAMMAR_SAMPLES: Record<string, { slug: string; section: string }> = {
  fr: { slug: 'passe-compose', section: 'etre' },
  es: { slug: 'usos-de-se', section: 'accidental' },
}

export async function getGrammarShowcase(code: CourseCode, locale: SiteLocale): Promise<GrammarShowcase | null> {
  const expl = locale
  const index = await loadGrammarIndex(code, expl)
  if (!index) return null
  const want = GRAMMAR_SAMPLES[code]
  const mod = await loadGrammarModule(code, want.slug, expl)
    ?? await loadGrammarModule(code, index.modules[0].slug, expl)
  if (!mod) return null
  const section = mod.sections.find(s => s.id === want.section) ?? mod.sections[0]
  return { code, index, sample: { moduleTitle: mod.title, level: mod.level, section } }
}

// ── Verbs ─────────────────────────────────────────────────────────────────────

const FEATURED_VERBS: Record<CourseCode, string[]> = {
  fr: ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'vouloir', 'venir', 'prendre'],
  es: ['ser', 'estar', 'tener', 'ir', 'hacer', 'poder', 'querer', 'decir'],
  en: ['be', 'have', 'go', 'do', 'make', 'get', 'take', 'say'],
}

export type VerbShowcase = {
  code: CourseCode
  total: number
  irregular: number
  tenses: number
  moods: { name: string; tenses: { key: string; name: string }[] }[]
  persons: string[]
  imperativePersons: string[]
  featured: {
    id: string
    infinitive: string
    translation: string
    forms: VerbForms
    examples: Record<string, { text: string; translation: string }>
  }[]
  all: { infinitive: string; translation: string }[]
}

export async function getVerbShowcase(code: CourseCode, locale: SiteLocale): Promise<VerbShowcase | null> {
  const [index, forms, examples] = await Promise.all([loadVerbIndex(code), loadVerbForms(code), loadVerbExamples(code)])
  if (!index || !forms) return null
  // The verb glosses are in the learner's language; the English course only has Spanish ones
  const trLang = code === locale ? (locale === 'es' ? 'en' : 'es') : locale
  const byId = new Map(index.verbs.map(v => [v.id, v]))
  const featured = FEATURED_VERBS[code]
    .map(id => byId.get(id))
    .filter(v => v !== undefined)
    .map(v => ({
      id: v.id,
      infinitive: v.infinitive,
      translation: verbTranslation(v, trLang),
      forms: forms[v.id] ?? {},
      examples: Object.fromEntries(
        Object.entries(examples?.[v.id] ?? {}).map(([tense, ex]) => [tense, { text: ex.text, translation: ex.translations[trLang] ?? '' }]),
      ),
    }))
  return {
    code,
    total: index.verbs.length,
    irregular: index.verbs.filter(v => v.irregular).length,
    tenses: index.moods.reduce((n, m) => n + m.tenses.length, 0),
    moods: index.moods,
    persons: index.persons,
    imperativePersons: index.imperativePersons,
    featured,
    all: index.verbs
      .map(v => ({ infinitive: v.infinitive, translation: verbTranslation(v, trLang) }))
      .sort((a, b) => a.infinitive.localeCompare(b.infinitive, code)),
  }
}
