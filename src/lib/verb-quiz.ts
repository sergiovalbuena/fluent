// Questions for the verb challenge (/verbs/practice), built from the generated verb data.
import type { VerbEntry, VerbForms, VerbIndex } from '@/lib/verbs'

export type QuizMode = 'choose' | 'type'

export type QuizQuestion = {
  id: string
  verb: VerbEntry
  tenseKey: string
  /** Subject shown before the gap: "nous", "j'", "(tu)" */
  subject: string
  /** What the learner picks or types: "avons mangé" */
  answer: string
  /** The whole form, for audio and feedback: "nous avons mangé" */
  full: string
  options: string[]
}

export type TenseOption = { key: string; label: string; mood: string }

// English imperative rows are "(let's)" / "(negative)": not useful as a drill
const EXCLUDED: Record<string, string[]> = { en: ['IMPERATIVE'] }

const SUBJECT_RE: Record<string, RegExp> = {
  fr: /^((?:que |qu')?(?:j'|je |tu |il\/elle |nous |vous |ils\/elles ))/,
  en: /^(I |you |he\/she |we |they )/,
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Tenses the game offers. A tense name repeated across moods ("Présent") gets the mood
 *  ("Subjonctif présent"), except in the first mood. */
export function quizTenses(index: VerbIndex): TenseOption[] {
  const excluded = EXCLUDED[index.language] ?? []
  const counts = new Map<string, number>()
  for (const m of index.moods) for (const t of m.tenses) counts.set(t.name, (counts.get(t.name) ?? 0) + 1)
  return index.moods.flatMap((m, mi) =>
    m.tenses
      .filter(t => !excluded.includes(t.key))
      .map(t => ({
        key: t.key,
        mood: m.name,
        label: mi > 0 && (counts.get(t.name) ?? 0) > 1 ? `${m.name} ${t.name.toLowerCase()}` : t.name,
      })),
  )
}

/** "nous avons mangé" → { subject: "nous", rest: "avons mangé" } */
function split(form: string, lang: string, imperative: boolean, imperativeLabel: string) {
  if (imperative) return { subject: imperativeLabel, rest: form }
  const m = SUBJECT_RE[lang]?.exec(form)
  if (!m) return { subject: '', rest: form }
  return { subject: m[1].trim(), rest: form.slice(m[1].length) }
}

function question(
  verb: VerbEntry, forms: VerbForms, tenseKey: string, person: number,
  index: VerbIndex, pool: { verb: VerbEntry; forms: VerbForms }[],
): QuizQuestion | null {
  const row = forms[tenseKey]
  const full = row?.[person]
  if (!full) return null
  const imperative = row.length === 3
  const { subject, rest } = split(full, index.language, imperative, index.imperativePersons[person] ?? '')

  const restOf = (f: string | null | undefined, imp: boolean, p: number) =>
    f ? split(f, index.language, imp, index.imperativePersons[p] ?? '').rest : null

  // Distractors: the same person in other tenses (the classic mix-up), then other
  // persons in this tense, then the same slot of other verbs
  const sameVerbOtherTenses = shuffle(
    Object.entries(forms)
      .filter(([k, r]) => k !== tenseKey && r.length === row.length)
      .map(([, r]) => restOf(r[person], imperative, person)),
  )
  const sameTenseOtherPersons = shuffle(row.map((f, p) => (p === person ? null : restOf(f, imperative, p))))
  const otherVerbs = shuffle(pool.filter(o => o.verb.id !== verb.id).slice(0, 40))
    .map(o => restOf(o.forms[tenseKey]?.[person], imperative, person))

  const seen = new Set([rest.toLowerCase()])
  const options: string[] = []
  const take = (list: (string | null)[], max: number) => {
    let n = 0
    for (const o of list) {
      if (options.length >= 3 || n >= max) break
      if (!o || seen.has(o.toLowerCase())) continue
      seen.add(o.toLowerCase())
      options.push(o)
      n++
    }
  }
  take(sameVerbOtherTenses, 2)
  take(sameTenseOtherPersons, 1)
  take(sameVerbOtherTenses, 3)
  take(sameTenseOtherPersons, 3)
  take(otherVerbs, 3)

  return {
    id: `${verb.id}|${tenseKey}|${person}`,
    verb, tenseKey, subject, answer: rest, full,
    options: shuffle([rest, ...options]),
  }
}

/** A round: one question per verb where possible, random tense and person */
export function buildRound(
  verbs: VerbEntry[], allForms: Record<string, VerbForms>, tenseKeys: string[],
  index: VerbIndex, length = 10,
): QuizQuestion[] {
  const pool = verbs.filter(v => allForms[v.id]).map(v => ({ verb: v, forms: allForms[v.id] }))
  if (pool.length === 0 || tenseKeys.length === 0) return []
  const order = shuffle(pool)
  const out: QuizQuestion[] = []
  const used = new Set<string>()
  // Distinct verbs first; with few verbs (e.g. one) they repeat with other tenses and persons
  for (let attempt = 0; out.length < length && attempt < length * 20; attempt++) {
    const { verb, forms } = order[attempt % order.length]
    const keys = shuffle(tenseKeys.filter(k => forms[k]))
    if (keys.length === 0) continue
    const row = forms[keys[0]]
    const persons = shuffle(row.map((f, i) => (f ? i : -1)).filter(i => i >= 0))
    if (persons.length === 0) continue
    const q = question(verb, forms, keys[0], persons[0], index, pool)
    if (!q || used.has(q.id)) continue
    used.add(q.id)
    out.push(q)
  }
  return out
}

const fold = (s: string) =>
  s.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim()
const bare = (s: string) => fold(s).normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Typed answer: exact, right but for accents ("almost"), or wrong. The subject is optional. */
export function checkTyped(input: string, q: QuizQuestion): 'correct' | 'almost' | 'wrong' {
  const given = fold(input)
  if (!given) return 'wrong'
  const targets = [q.answer, q.full].map(fold)
  if (targets.includes(given)) return 'correct'
  if (targets.map(bare).includes(bare(given))) return 'almost'
  return 'wrong'
}
