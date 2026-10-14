#!/usr/bin/env node
// Checks the authoring JSON of a course before generating its SQL.
//
// Usage: node scripts/validate-course.mjs en
//
// Errors fail the run; warnings point at things worth a look.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const lang = process.argv[2]
if (!lang) {
  console.error('Usage: node scripts/validate-course.mjs <language_code>')
  process.exit(1)
}

const dir = join('content', lang)
const files = readdirSync(dir).filter(f => /^(lecon|lesson)-\d+\.json$/.test(f)).sort()
// Translations every item must carry: Spanish always, English too unless the course is English
const required = lang === 'en' ? ['es'] : ['en', 'es']

let errors = 0
let warnings = 0
const err = (f, msg) => { errors++; console.log(`✗ ${f}: ${msg}`) }
const warn = (f, msg) => { warnings++; console.log(`⚠ ${f}: ${msg}`) }
const str = v => typeof v === 'string' && v.trim().length > 0
const hasTr = (o, keys = required) => keys.every(k => str(o?.[k]))

const seenWords = new Map()

for (const file of files) {
  let d
  try { d = JSON.parse(readFileSync(join(dir, file), 'utf8')) } catch (e) { err(file, `invalid JSON: ${e.message}`); continue }

  const n = Number(file.match(/\d+/)[0])
  if (d.lesson !== n) err(file, `lesson is ${d.lesson}, expected ${n}`)
  if (!str(d.slug)) err(file, 'missing slug')
  if (!str(d.icon)) err(file, 'missing icon')
  if (!str(d.title?.[lang]) || !str(d.title?.es)) err(file, `title needs ${lang} and es`)

  const count = (key, min) => {
    const arr = d[key]
    if (!Array.isArray(arr)) { err(file, `${key} missing`); return [] }
    if (arr.length < min) err(file, `${key}: ${arr.length} items, expected at least ${min}`)
    return arr
  }

  count('grammar', 3).forEach((g, i) => {
    if (!str(g.structure) || !str(g.example) || !hasTr(g, ['en', 'es'])) err(file, `grammar[${i}] needs structure, example, en, es`)
  })
  count('tips', 3).forEach((t, i) => { if (!hasTr(t, ['en', 'es'])) err(file, `tips[${i}] needs en and es`) })

  const words = new Set()
  count('vocabulary', 12).forEach((v, i) => {
    if (!str(v.word) || !hasTr(v)) err(file, `vocabulary[${i}] needs word + ${required.join(', ')}`)
    const key = v.word?.toLowerCase()
    if (words.has(key)) err(file, `duplicate word "${v.word}"`)
    words.add(key)
    if (seenWords.has(key)) warn(file, `"${v.word}" already taught in lesson ${seenWords.get(key)}`)
    else seenWords.set(key, n)
  })

  count('phrases', 10).forEach((p, i) => { if (!str(p.phrase) || !hasTr(p)) err(file, `phrases[${i}] needs phrase + ${required.join(', ')}`) })

  count('qa', 6).forEach((q, i) => {
    if (!hasTr(q.question, ['en', 'es'])) err(file, `qa[${i}].question needs en and es`)
    if (!hasTr(q.explanation, ['en', 'es'])) err(file, `qa[${i}].explanation needs en and es`)
    const opts = Array.isArray(q.options) ? q.options : q.options?.[lang === 'en' ? 'es' : 'en']
    if (!Array.isArray(opts) || opts.length < 3) { err(file, `qa[${i}] needs at least 3 options`); return }
    if (new Set(opts).size !== opts.length) err(file, `qa[${i}] has duplicate options`)
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= opts.length) err(file, `qa[${i}].correct out of range`)
  })

  const s = d.story
  if (!str(s?.title) || !str(s?.text) || !hasTr(s)) err(file, `story needs title, text + ${required.join(', ')}`)
  for (const w of s?.highlighted_words ?? []) {
    if (!s.text.toLowerCase().includes(w.toLowerCase())) err(file, `highlighted "${w}" not in story text`)
  }
  if (s?.text && s.text.split(/\s+/).length < 60) warn(file, `story is short (${s.text.split(/\s+/).length} words)`)

  count('arrange', 4).forEach((a, i) => {
    if (!str(a.sentence) || !hasTr(a)) err(file, `arrange[${i}] needs sentence + ${required.join(', ')}`)
    else if (a.sentence.split(' ').length < 3) warn(file, `arrange[${i}] has fewer than 3 words`)
  })
  count('translate', 4).forEach((t, i) => {
    if (!str(t.answer) || !hasTr(t)) err(file, `translate[${i}] needs answer + ${required.join(', ')}`)
    // Typed answers are matched exactly (ignoring case/punctuation): avoid ambiguous contractions
    if (lang === 'en' && /\b\w+'(m|re|s|ve|ll|d|t)\b/i.test(t.answer ?? '')) warn(file, `translate[${i}] answer has a contraction: "${t.answer}"`)
  })
}

console.log(`\n${files.length} lessons · ${errors} errors · ${warnings} warnings`)
process.exit(errors > 0 ? 1 : 0)
