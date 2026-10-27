#!/usr/bin/env node
// Loads (or updates) a course in Supabase from content/<lang>/*.json, in place:
// existing modules and lessons keep their ids, so learners keep their progress.
// Modules of that language that no longer exist in content/ are removed with --prune.
//
// Usage: node --env-file=.env.local --experimental-strip-types scripts/load-course.mts es [--prune] [--dry-run]
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js'
import { courseBuilder, courseFiles, readLesson } from './course-content.mjs'

type LessonRow = { type: string; title: string; content: unknown }

const lang = process.argv[2]
const prune = process.argv.includes('--prune')
const dryRun = process.argv.includes('--dry-run')
if (!lang) {
  console.error('Usage: scripts/load-course.mts <language_code> [--prune] [--dry-run]')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })
const { lessonsFor, moduleFor } = courseBuilder(lang)

const { data: existing, error: listError } = await supabase.from('modules').select('id, slug').eq('language_code', lang)
if (listError) throw listError
const bySlug = new Map((existing ?? []).map(m => [m.slug as string, m.id as string]))

let created = 0
let updated = 0
const slugs = new Set<string>()

for (const file of courseFiles(lang)) {
  const d = readLesson(file)
  const row = moduleFor(d)
  slugs.add(row.slug)
  let moduleId = bySlug.get(row.slug)

  if (dryRun) {
    console.log(`${moduleId ? 'update' : 'create'} ${row.slug} · ${row.title}`)
    continue
  }

  if (moduleId) {
    const { error } = await supabase.from('modules').update(row).eq('id', moduleId)
    if (error) throw error
    updated++
  } else {
    const { data, error } = await supabase.from('modules').insert(row).select('id').single()
    if (error) throw error
    moduleId = data.id as string
    created++
  }

  const { data: current, error: lessonsError } = await supabase.from('lessons').select('id, type').eq('module_id', moduleId)
  if (lessonsError) throw lessonsError
  const byType = new Map((current ?? []).map(l => [l.type as string, l.id as string]))

  const lessons = lessonsFor(d) as LessonRow[]
  for (const [i, l] of lessons.entries()) {
    const values = { module_id: moduleId, type: l.type, title: l.title, content: l.content, order_index: i + 1, is_published: true }
    const id = byType.get(l.type)
    const { error } = id
      ? await supabase.from('lessons').update(values).eq('id', id)
      : await supabase.from('lessons').insert(values)
    if (error) throw new Error(`${row.slug} ${l.type}: ${error.message}`)
  }
}

const stale = [...bySlug].filter(([slug]) => !slugs.has(slug))
if (stale.length) {
  if (prune && !dryRun) {
    const { error } = await supabase.from('modules').delete().in('id', stale.map(([, id]) => id))
    if (error) throw error
    console.log(`removed ${stale.length} old modules: ${stale.map(([s]) => s).join(', ')}`)
  } else {
    console.log(`${stale.length} modules not in content/${lang} (use --prune to remove): ${stale.map(([s]) => s).join(', ')}`)
  }
}
console.log(dryRun ? 'dry run, nothing written' : `${lang}: ${created} modules created, ${updated} updated`)
