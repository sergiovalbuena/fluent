#!/usr/bin/env node
// Generates the SQL that loads a course from content/<lang>/lecon-NN.json into Supabase.
//
// Usage: node scripts/generate-course-sql.mjs fr > supabase/seed/french_course.sql
//
// The authoring JSON keeps translations side by side ({ en, es }).
// The app reads `translation` (legacy default) plus `translations: { es }`,
// so each item is converted to that shape here. For the English course there
// is no English "translation": items carry { es } and Spanish is the default.
//
// Output: one statement per module, so it can be applied in small batches.
// Existing modules/lessons for the language are replaced.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const lang = process.argv[2]
if (!lang) {
  console.error('Usage: node scripts/generate-course-sql.mjs <language_code>')
  process.exit(1)
}

const dir = join('content', lang)
const files = readdirSync(dir).filter(f => /^(lecon|lesson)-\d+\.json$/.test(f)).sort()

// Activity titles shown in the lesson, in the course language
const LESSON_TITLES = {
  fr: { vocabulary: 'Vocabulaire', phrases: 'Phrases', qa: 'Questions', arrange: 'Construis des phrases', translate: 'Traduis en français' },
  en: { vocabulary: 'Vocabulary', phrases: 'Phrases', qa: 'Questions', arrange: 'Build sentences', translate: 'Translate into English' },
}
const titles = LESSON_TITLES[lang]
if (!titles) {
  console.error(`No lesson titles for "${lang}" — add them to LESSON_TITLES`)
  process.exit(1)
}
// Language of the legacy `translation` field
const base = lang === 'en' ? 'es' : 'en'

const sqlString = s => `'${String(s).replace(/'/g, "''")}'`
const sqlJson = v => `${sqlString(JSON.stringify(v))}::jsonb`

// { en, es } → legacy `translation` + `translations` (es)
const tr = t => ({ translation: t[base], translations: { es: t.es } })

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
  const enOptions = Array.isArray(q.options) ? q.options : q.options[base]
  const order = seededPermutation(enOptions.length, `${lessonNumber}-${i}`)
  const reorder = opts => order.map(k => opts[k])
  const es = { question: q.question.es, explanation: q.explanation.es }
  if (!Array.isArray(q.options)) es.options = reorder(q.options.es)
  return {
    id: String(i + 1),
    // Questions are always authored in English too; Spanish is the translation
    question: q.question.en,
    options: reorder(enOptions),
    correct: order.indexOf(q.correct),
    explanation: q.explanation.en,
    translations: { es },
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
      // For translate items, `prompt` is the sentence to translate, with its es version
      content: { items: d.translate.map(t => ({ prompt: t[base], translations: { es: t.es }, answer: t.answer })) },
    },
  ]
}

const out = [
  `-- ${lang} course generated from content/${lang}/ (${files.length} lessons) by scripts/generate-course-sql.mjs`,
  '-- Replaces every existing module and lesson for this language.',
  '',
  `delete from lessons where module_id in (select id from modules where language_code = ${sqlString(lang)});`,
  `delete from modules where language_code = ${sqlString(lang)};`,
  '',
]

for (const file of files) {
  const d = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  const values = lessonsFor(d).map((l, i) =>
    `  (${sqlString(l.type)}, ${sqlString(l.title)}, ${sqlJson(l.content)}, ${i + 1})`
  )
  out.push(
    `-- ${d.lesson}: ${d.title[lang]}`,
    `with m as (`,
    `  insert into modules (language_code, slug, title, icon, description, order_index, is_published)`,
    `  values (${sqlString(lang)}, ${sqlString(d.slug)}, ${sqlString(d.title[lang])}, ${sqlString(d.icon)}, ${sqlString(d.title.es)}, ${d.lesson}, true)`,
    `  returning id`,
    `)`,
    `insert into lessons (module_id, type, title, content, order_index, is_published)`,
    `select m.id, v.type, v.title, v.content, v.ord, true from m, (values`,
    values.join(',\n'),
    `) as v(type, title, content, ord);`,
    '',
  )
}

process.stdout.write(out.join('\n'))
