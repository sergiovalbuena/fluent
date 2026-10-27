#!/usr/bin/env node
// Generates the SQL that loads a course from content/<lang>/lecon-NN.json into Supabase.
//
// Usage: node scripts/generate-course-sql.mjs fr > supabase/seed/french_course.sql
//        node scripts/generate-course-sql.mjs fr --only qa   (updates the Q&A activities in place)
//
// The authoring JSON keeps translations side by side ({ en, es }).
// The app reads `translation` (legacy default) plus `translations: { es }`,
// so each item is converted to that shape here. For the English course there
// is no English "translation": items carry { es } and Spanish is the default.
//
// Output: one statement per module, so it can be applied in small batches.
// Existing modules/lessons for the language are replaced.

import { courseBuilder, courseFiles, readLesson } from './course-content.mjs'

const lang = process.argv[2]
if (!lang) {
  console.error('Usage: node scripts/generate-course-sql.mjs <language_code>')
  process.exit(1)
}

const files = courseFiles(lang)
const { lessonsFor, moduleFor } = courseBuilder(lang)

const sqlString = s => `'${String(s).replace(/'/g, "''")}'`
const sqlJson = v => `${sqlString(JSON.stringify(v))}::jsonb`

const out = [
  `-- ${lang} course generated from content/${lang}/ (${files.length} lessons) by scripts/generate-course-sql.mjs`,
  '-- Replaces every existing module and lesson for this language.',
  '',
  `delete from lessons where module_id in (select id from modules where language_code = ${sqlString(lang)});`,
  `delete from modules where language_code = ${sqlString(lang)};`,
  '',
]

// --only qa: update just the Q&A activity of each lesson in place, keeping the
// module and lesson ids (and with them the learners' progress)
if (process.argv.includes('--only') && process.argv[process.argv.indexOf('--only') + 1] === 'qa') {
  const updates = files.map(file => {
    const d = readLesson(file)
    const qa = lessonsFor(d).find(l => l.type === 'qa')
    return `update lessons set content = ${sqlJson(qa.content)} where type = 'qa' and module_id = (select id from modules where language_code = ${sqlString(lang)} and slug = ${sqlString(d.slug)});`
  })
  process.stdout.write(updates.join('\n') + '\n')
  process.exit(0)
}

for (const file of files) {
  const d = readLesson(file)
  const values = lessonsFor(d).map((l, i) =>
    `  (${sqlString(l.type)}, ${sqlString(l.title)}, ${sqlJson(l.content)}, ${i + 1})`
  )
  out.push(
    `-- ${d.lesson}: ${d.title[lang]}`,
    `with m as (`,
    `  insert into modules (language_code, slug, title, icon, description, order_index, is_published)`,
    `  values (${sqlString(lang)}, ${sqlString(d.slug)}, ${sqlString(d.title[lang])}, ${sqlString(d.icon)}, ${sqlString(d.title[lang === 'es' ? 'en' : 'es'])}, ${d.lesson}, true)`,
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
