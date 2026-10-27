// Turns a course's authoring JSON (content/<lang>/*.json) into the modules and
// lessons the app reads. Shared by generate-course-sql.mjs and load-course.mts.
//
// The authoring JSON keeps translations side by side ({ en, es }). The app reads
// `translation` (legacy default) plus `translations: { <learner language> }`.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export function courseFiles(lang) {
  const dir = join('content', lang)
  return readdirSync(dir).filter(f => /^(lecon|lesson|leccion)-\d+\.json$/.test(f)).sort().map(f => join(dir, f))
}

export function readLesson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function courseBuilder(lang) {
  // Activity titles shown in the lesson, in the course language
  const LESSON_TITLES = {
    fr: { vocabulary: 'Vocabulaire', phrases: 'Phrases', qa: 'Questions', arrange: 'Construis des phrases', translate: 'Traduis en français' },
    en: { vocabulary: 'Vocabulary', phrases: 'Phrases', qa: 'Questions', arrange: 'Build sentences', translate: 'Translate into English' },
    es: { vocabulary: 'Vocabulario', phrases: 'Frases', qa: 'Preguntas', arrange: 'Construye frases', translate: 'Traduce al español' },
  }
  const titles = LESSON_TITLES[lang]
  if (!titles) throw new Error(`No lesson titles for "${lang}" — add them to LESSON_TITLES`)
  // Learner languages each course is translated into; the first one also fills
  // the legacy `translation` field
  const LEARNER_LANGUAGES = { fr: ['en', 'es'], en: ['es'], es: ['en'] }
  const learners = LEARNER_LANGUAGES[lang]
  const base = learners[0]

  // { en, es } → legacy `translation` + `translations` (one per learner language)
  const tr = t => ({ translation: t[base], translations: Object.fromEntries(learners.map(l => [l, t[l]])) })

  // Deterministic shuffle (same output on every run) so the correct answer
  // isn't always the first option — the app shows options in stored order.
  function seededPermutation(n, seedText) {
    let seed = 0
    for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
    const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const order = [...Array(n).keys()]
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }

  function questionContent(q, i, lessonNumber) {
    const order = seededPermutation(q.options.length, `${lessonNumber}-${i}`)
    const reorder = opts => order.map(k => opts[k])
    // Asked and answered in the course language; the question in the learner's
    // language is a translation shown on demand
    const translations = Object.fromEntries(
      ['en', 'es'].filter(l => l !== lang).map(l => [l, { question: q.question[l], explanation: q.explanation[l] }]),
    )
    return {
      id: String(i + 1),
      question: q.question[lang],
      options: reorder(q.options),
      correct: order.indexOf(q.correct),
      explanation: q.explanation.en,
      translations,
    }
  }

  function lessonsFor(d) {
    return [
      {
        type: 'vocabulary',
        title: titles.vocabulary,
        content: {
          items: d.vocabulary.map((v, i) => ({ id: String(i + 1), word: v.word, ...tr(v) })),
          // Not rendered yet; kept with the lesson so a future grammar/tips UI can use it
          grammar: d.grammar,
          tips: d.tips,
        },
      },
      {
        type: 'phrases',
        title: titles.phrases,
        content: { phrases: d.phrases.map(p => ({ phrase: p.phrase, ...tr(p) })) },
      },
      {
        type: 'qa',
        title: titles.qa,
        content: { questions: d.qa.map((q, i) => questionContent(q, i, d.lesson)) },
      },
      {
        type: 'story',
        title: d.story.title,
        content: {
          text: d.story.text,
          ...tr(d.story),
          highlighted_words: d.story.highlighted_words,
        },
      },
      {
        type: 'arrange',
        title: titles.arrange,
        content: { sentences: d.arrange.map(a => ({ words: a.sentence.split(' '), ...tr(a) })) },
      },
      {
        type: 'translate',
        title: titles.translate,
        // For translate items, `prompt` is the sentence to translate, in each learner language
        content: { items: d.translate.map(t => ({ prompt: t[base], translations: tr(t).translations, answer: t.answer, ...(t.accept && { accept: t.accept }) })) },
      },
    ]
  }

  /** The module row: description is the title in the learner's language */
  const moduleFor = d => ({
    language_code: lang,
    slug: d.slug,
    title: d.title[lang],
    icon: d.icon,
    description: d.title[lang === 'es' ? 'en' : 'es'],
    order_index: d.lesson,
    is_published: true,
  })

  return { lessonsFor, moduleFor }
}
