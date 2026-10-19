#!/usr/bin/env node
// Validates the grammar modules in src/data/grammar/<course>/<explanations>/NN-slug.json
// and generates, per explanation language, index.json (list for /grammar) and
// modules.ts (lazy loaders). Every explanation language must have the same
// modules and exercises (progress is stored by exercise id).
//
//   node scripts/generate-grammar-index.mjs fr

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const lang = process.argv[2] ?? 'fr'
const root = join(import.meta.dirname, '..', 'src', 'data', 'grammar', lang)

// Parts of the course, shown as groups on /grammar (per explanation language)
const PARTS = {
  fr: {
    es: [
      { number: 1, title: 'Sonidos y bases', description: 'Cómo suena el francés, el género de las palabras y los dos verbos esenciales.' },
      { number: 2, title: 'El presente', description: 'Conjugar, hablar de comida y cantidades, contar y decir de quién es cada cosa.' },
      { number: 3, title: 'Contar, preguntar, describir', description: 'El pasado, las preguntas, la negación y los adjetivos.' },
      { number: 4, title: 'Sonar natural', description: 'La liaison, los pronombres, los verbos pronominales y el imparfait.' },
    ],
    en: [
      { number: 1, title: 'Sounds and basics', description: 'How French sounds, the gender of words and the two essential verbs.' },
      { number: 2, title: 'The present', description: 'Conjugating, talking about food and quantities, numbers and saying whose things are.' },
      { number: 3, title: 'Telling, asking, describing', description: 'The past, questions, negation and adjectives.' },
      { number: 4, title: 'Sounding natural', description: 'Liaison, pronouns, reflexive verbs and the imparfait.' },
    ],
  },
}

const errors = []
const results = {}

function processFolder(expl) {
  const dir = join(root, expl)
  const files = readdirSync(dir).filter(f => /^\d\d-.+\.json$/.test(f) && f !== 'index.json').sort()
  const modules = files.map(f => ({ file: f, data: JSON.parse(readFileSync(join(dir, f), 'utf8')) }))
  const numbers = new Set(modules.map(m => m.data.number))

  function checkMarkup(where, text) {
    if (typeof text !== 'string') return
    const stars = text.replace(/\*\*/g, '').split('*').length - 1
    if (stars % 2) errors.push(`${where}: unbalanced *`)
    if ((text.match(/\*\*/g) ?? []).length % 2) errors.push(`${where}: unbalanced **`)
    if ((text.match(/\{/g) ?? []).length !== (text.match(/\}/g) ?? []).length) errors.push(`${where}: unbalanced {}`)
    for (const m of text.matchAll(/\[\[(\d+)\]\]/g)) {
      if (!numbers.has(Number(m[1]))) errors.push(`${where}: link to missing module ${m[1]}`)
    }
  }

  function walk(where, value) {
    if (typeof value === 'string') checkMarkup(where, value)
    else if (Array.isArray(value)) value.forEach((v, i) => walk(`${where}[${i}]`, v))
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(`${where}.${k}`, v)
  }

  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()

  for (const { file, data: m } of modules) {
    const at = file
    if (!file.startsWith(String(m.number).padStart(2, '0'))) errors.push(`${at}: number ${m.number} does not match the file name`)
    if (!file.endsWith(`-${m.slug}.json`)) errors.push(`${at}: slug ${m.slug} does not match the file name`)
    for (const key of ['title', 'tagline', 'goal', 'minutes', 'part', 'sections', 'exercises', 'checklist']) {
      if (m[key] === undefined) errors.push(`${at}: missing ${key}`)
    }
    walk(at, m)

    const exIds = new Set()
    for (const ex of m.exercises) {
      const w = `${at} › ${ex.id}`
      if (exIds.has(ex.id)) errors.push(`${w}: duplicate exercise id`)
      exIds.add(ex.id)
      if (!['choice', 'type', 'order'].includes(ex.kind)) errors.push(`${w}: unknown kind ${ex.kind}`)
      if (ex.section !== 'final' && !m.sections.some(sec => sec.id === ex.section)) errors.push(`${w}: unknown section ${ex.section}`)
      if (!ex.items?.length) errors.push(`${w}: no items`)
      ex.items.forEach((item, i) => {
        const wi = `${w}[${i}]`
        if (!item.answer) errors.push(`${wi}: no answer`)
        if (ex.kind === 'choice') {
          const options = item.options ?? ex.options ?? []
          if (options.length < 2) errors.push(`${wi}: fewer than 2 options`)
          if (!options.includes(item.answer)) errors.push(`${wi}: answer «${item.answer}» is not an option`)
          if (new Set(options).size !== options.length) errors.push(`${wi}: duplicate options`)
        }
        if (ex.kind === 'order') {
          const words = item.words ?? []
          if (norm(words.join(' ')) !== norm(item.answer)) {
            const a = norm(item.answer).split(' ').sort().join(' ')
            if (a !== norm(words.join(' ')).split(' ').sort().join(' ')) errors.push(`${wi}: words do not form the answer`)
          }
        }
        if (ex.listen && !item.prompt && !item.say && ex.speak !== 'answer') errors.push(`${wi}: listening item with nothing to read`)
        if (!ex.listen && !item.prompt && ex.kind !== 'order' && ex.kind !== 'choice') errors.push(`${wi}: no prompt`)
        const gaps = (item.prompt ?? '').split('___').length - 1
        if (gaps > 1 && item.answer.split(' … ').length !== gaps) errors.push(`${wi}: ${gaps} gaps but answer has ${item.answer.split(' … ').length} parts`)
      })
    }
  }


  const index = {
    language: lang,
    parts: PARTS[lang]?.[expl] ?? [],
    modules: modules.map(({ data: m }) => ({
      slug: m.slug,
      number: m.number,
      part: m.part,
      title: m.title,
      tagline: m.tagline,
      minutes: m.minutes,
      sections: m.sections.map(s => s.title),
      exercises: m.exercises.map(e => ({ id: e.id, title: e.title, section: e.section, count: e.items.length })),
    })),
  }
  const items = modules.reduce((n, { data: m }) => n + m.exercises.reduce((k, e) => k + e.items.length, 0), 0)
  results[expl] = { modules, items, dir, index }
}

const explanations = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()
for (const expl of explanations) processFolder(expl)

// Same modules and exercises in every explanation language
const [base, ...others] = explanations
const shape = r => r.modules.map(({ data: m }) => `${m.slug}:${m.exercises.map(e => `${e.id}/${e.section}/${e.items.length}`).join(',')}:${m.checklist.length}`)
for (const other of others) {
  const a = shape(results[base]), b = shape(results[other])
  a.forEach((x, i) => { if (x !== b[i]) errors.push(`${base} ≠ ${other}: ${x}  vs  ${b[i] ?? '(missing)'}`) })
  if (b.length > a.length) errors.push(`${other} has extra modules`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} error(s)`)
  process.exit(1)
}

for (const expl of explanations) {
  const { modules, items, dir, index } = results[expl]
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
  const loaders = modules.map(({ file, data: m }) => `  '${m.slug}': () => import('./${file}'),`).join('\n')
  writeFileSync(
    join(dir, 'modules.ts'),
    `// Generated by scripts/generate-grammar-index.mjs — do not edit\n\nexport const modules: Record<string, () => Promise<{ default: unknown }>> = {\n${loaders}\n}\n`,
  )
  console.log(`${expl}: ${modules.length} modules, ${items} exercise items → src/data/grammar/${lang}/${expl}/`)
}
