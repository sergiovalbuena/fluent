import { localizeQuestion, pickTranslation, type RawQuestion } from '@/lib/languages'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VocabWord {
  word: string
  translation: string
  emoji: string
  example?: string
}

export interface Phrase {
  phrase: string
  translation: string
  /** Sentences only: it's a question (half of each lesson's sentences are) */
  question?: boolean
  /** Sentences only: parts that use the lesson's grammar or vocabulary, shown in bold */
  bold?: string[]
}

export interface QAQuestion {
  /** In the course language */
  question: string
  /** The question in the learner's language, shown on demand */
  translation?: string | null
  options: string[]
  correct: number
  explanation?: string
}

export interface ArrangeSentence {
  words: string[]
  translation: string
}

export interface TranslateItem {
  prompt: string
  answer: string
  /** Other correct answers */
  accept?: string[]
  hint?: string
}

export interface LessonContent {
  words?: VocabWord[]
  phrases?: Phrase[]
  questions?: QAQuestion[]
  /** Replace `questions` in converted lessons: repeated like phrases */
  sentences?: Phrase[]
  story?: string
  storyTranslation?: string
  highlightedWords?: string[]
  arrangeSentences?: ArrangeSentence[]
  translateItems?: TranslateItem[]
}

export type RawItem = {
  word?: string; translation?: string; translations?: Record<string, string>; icon?: string; example?: string
  phrase?: string; prompt?: string; answer?: string; accept?: string[]; hint?: string
  sentence?: string; kind?: string; bold?: string[]
}

export interface RawContent {
  items?: RawItem[]
  // Some phrase lessons store their list under `phrases` instead of `items`
  phrases?: RawItem[]
  questions?: RawQuestion[]
  sentences?: Array<{ words: string[]; translation: string; translations?: Record<string, string> }>
  text?: string
  translation?: string
  translations?: Record<string, string>
  highlighted_words?: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizeContent(raw: RawContent, lessonType: string, translationLang: string): LessonContent {
  if (lessonType === 'vocabulary') {
    return {
      words: (raw.items ?? []).map(i => ({
        word: i.word ?? '',
        translation: pickTranslation(i, translationLang),
        emoji: i.icon ?? '📝',
        example: i.example,
      })),
    }
  }
  if (lessonType === 'phrases') {
    return {
      phrases: (raw.items ?? raw.phrases ?? []).map(i => ({
        phrase: i.phrase ?? '',
        translation: pickTranslation(i, translationLang),
      })),
    }
  }
  if (lessonType === 'qa') {
    // Converted lessons carry sentences in `items` (and still the old `questions` for the
    // published app until every lesson is converted): sentences win
    if (raw.items?.length) {
      return {
        sentences: raw.items.map(i => ({
          phrase: i.sentence ?? '',
          translation: pickTranslation(i, translationLang),
          question: i.kind === 'question',
          bold: i.bold,
        })),
      }
    }
    return {
      questions: (raw.questions ?? []).map(q => localizeQuestion(q, translationLang)),
    }
  }
  if (lessonType === 'story') {
    return { story: raw.text, storyTranslation: pickTranslation(raw, translationLang), highlightedWords: raw.highlighted_words }
  }
  if (lessonType === 'arrange') {
    return {
      arrangeSentences: (raw.sentences ?? []).map(s => ({
        words: s.words,
        translation: pickTranslation(s, translationLang),
      })),
    }
  }
  if (lessonType === 'translate') {
    return {
      translateItems: (raw.items ?? []).map(i => ({
        // `translations` on a translate item holds the prompt in other languages
        prompt: i.translations?.[translationLang] ?? i.prompt ?? '',
        answer: i.answer ?? '',
        accept: i.accept,
        hint: i.hint,
      })),
    }
  }
  return {}
}

// Spanish usually drops the subject pronoun: «Estoy cansado» = «Yo estoy cansado»
export const SPANISH_SUBJECT = /^(yo|tu|el|ella|usted|nosotros|nosotras|ustedes|ellos|ellas|vosotros|vosotras) /

export function fuzzyMatch(input: string, answers: string[], languageCode: string): boolean {
  const normalize = (s: string) => {
    const plain = s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[¿¡.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return languageCode === 'es' ? plain.replace(SPANISH_SUBJECT, '') : plain
  }
  return answers.some(a => normalize(input) === normalize(a))
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
