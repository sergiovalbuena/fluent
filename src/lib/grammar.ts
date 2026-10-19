// Grammar modules (/grammar): theory + auto-graded exercises, one JSON file per
// module in src/data/grammar/<lang>/. The index and the loader map are generated
// by scripts/generate-grammar-index.mjs.
//
// Inline markup in texts and table cells:
//   *texte*     French: italic, read aloud on click; {x} inside it is highlighted
//   **texto**   bold
//   [[6]]       link to module 6

export type GrammarBlock =
  | { type: 'text'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'callout'; tone: 'tip' | 'warning' | 'note'; title?: string; text: string }
  | { type: 'examples'; items: { fr: string; tr: string; note?: string }[] }
  | { type: 'formula'; text: string; caption?: string }
  /** Sound cards: a spelling, its sound, a hint and example words to listen to */
  | { type: 'sounds'; items: { label: string; ipa?: string; hint: string; examples: string[] }[] }
  /** Verb cards: one per verb, a form per person (French, {x} highlighted), optional notes */
  | { type: 'conjugation'; persons: string[]; verbs: { verb: string; meaning: string; forms: string[]; notes?: string[] }[] }

export type GrammarSection = { id: string; title: string; blocks: GrammarBlock[] }

export type ExerciseKind = 'choice' | 'type' | 'order'

export type ExerciseItem = {
  /** French with ___ for the gap; {x} is highlighted. Parentheses are hints (not read aloud). */
  prompt?: string
  /** Choice: overrides the exercise options */
  options?: string[]
  /** Canonical answer. Several gaps: parts joined with " … " */
  answer: string
  /** Typed: other accepted answers */
  accept?: string[]
  /** Order: the words to arrange (shuffled on screen) */
  words?: string[]
  /** What is read aloud after answering (default depends on the exercise) */
  say?: string
  explain?: string
  /** false: left out of the mixed review (only makes sense after the previous items) */
  mixed?: false
}

export type GrammarExercise = {
  id: string
  /** The section it practises, shown right after it ('final': after the last section) */
  section: string
  title: string
  instructions: string
  kind: ExerciseKind
  /** Choice: options shared by every item */
  options?: string[]
  /** The prompt is heard, not read (shown after answering) */
  listen?: boolean
  /** What to read aloud after answering: the completed prompt, the prompt, the answer, or nothing */
  speak?: 'filled' | 'prompt' | 'answer' | 'none'
  items: ExerciseItem[]
}

export type GrammarModule = {
  slug: string
  number: number
  part: number
  title: string
  tagline: string
  goal: string
  minutes: number
  sections: GrammarSection[]
  exercises: GrammarExercise[]
  checklist: string[]
  /** One task to do outside the app (not graded) */
  challenge?: { title: string; text: string }
}

export type GrammarIndexEntry = {
  slug: string
  number: number
  part: number
  title: string
  tagline: string
  minutes: number
  sections: string[]
  exercises: { id: string; title: string; section: string; count: number }[]
}

export type GrammarIndex = {
  language: string
  parts: { number: number; title: string; description: string }[]
  modules: GrammarIndexEntry[]
}

export const GRAMMAR_LANGUAGES = ['fr'] as const

/** Explanations exist in Spanish and English; any other native language reads the English ones */
export type ExplanationLanguage = 'es' | 'en'

/** Accounts that read the Spanish explanations whatever their translation language (the owner's, at his request) */
const SPANISH_EXPLANATIONS = new Set(['3c8a6d64-5446-4acb-936a-8347b2ed0344'])

export function explanationLanguage(translationLang: string, userId: string | null): ExplanationLanguage {
  return translationLang === 'es' || (userId !== null && SPANISH_EXPLANATIONS.has(userId)) ? 'es' : 'en'
}

export async function loadGrammarIndex(lang: string, expl: ExplanationLanguage): Promise<GrammarIndex | null> {
  if (lang !== 'fr') return null
  const data = expl === 'es'
    ? await import('@/data/grammar/fr/es/index.json')
    : await import('@/data/grammar/fr/en/index.json')
  return data.default as GrammarIndex
}

export async function loadGrammarModule(lang: string, slug: string, expl: ExplanationLanguage): Promise<GrammarModule | null> {
  if (lang !== 'fr') return null
  const { modules } = expl === 'es'
    ? await import('@/data/grammar/fr/es/modules')
    : await import('@/data/grammar/fr/en/modules')
  const load = modules[slug]
  return load ? ((await load()).default as GrammarModule) : null
}

// ── Markup ────────────────────────────────────────────────────────────────────

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'fr'; text: string }
  | { kind: 'link'; module: number }

export function tokenize(text: string): InlineToken[] {
  const out: InlineToken[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[\[(\d+)\]\]/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ kind: 'bold', text: m[1] })
    else if (m[2] !== undefined) out.push({ kind: 'fr', text: m[2] })
    else out.push({ kind: 'link', module: Number(m[3]) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

/** Splits "parl{e}" into plain and highlighted parts */
export function highlights(text: string): { text: string; hl: boolean }[] {
  return text.split(/(\{[^}]*\})/).filter(Boolean).map(p =>
    p.startsWith('{') ? { text: p.slice(1, -1), hl: true } : { text: p, hl: false },
  )
}

/** Text without markup, for reading aloud */
export function plain(text: string): string {
  return text.replace(/[{}]/g, '').replace(/‿|│/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Exercises ─────────────────────────────────────────────────────────────────

export const BLANK = '___'

/** The prompt with its gaps filled by the answer */
export function fillPrompt(prompt: string, answer: string): string {
  const gaps = prompt.split(BLANK).length - 1
  if (gaps === 0) return prompt
  const parts = gaps > 1 ? answer.split(' … ') : [answer]
  let i = 0
  // An elided answer joins the next word: "de l'" + "eau" → "de l'eau"
  return prompt.replace(/___/g, () => parts[Math.min(i++, parts.length - 1)]).replace(/' (?=\S)/g, "'")
}

/** What to read aloud once the item is answered */
export function spokenText(ex: GrammarExercise, item: ExerciseItem): string | null {
  if (item.say) return item.say
  const prompt = item.prompt ?? ''
  const mode = ex.speak ?? (prompt.includes(BLANK) ? 'filled' : 'answer')
  const text =
    mode === 'none' ? '' :
    mode === 'prompt' ? prompt :
    mode === 'filled' ? fillPrompt(prompt, item.answer) :
    item.answer
  const clean = plain(text.replace(/\([^)]*\)/g, ''))
  return clean || null
}

const fold = (s: string) =>
  s.toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[«»"]/g, '')
    .replace(/\s*([?!.,;:])\s*/g, '$1 ')
    .replace(/[.!?]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
const bare = (s: string) => fold(s).normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Typed answer: exact, right but for accents ("almost"), or wrong */
export function checkAnswer(input: string, item: ExerciseItem): 'correct' | 'almost' | 'wrong' {
  const given = fold(input)
  if (!given) return 'wrong'
  const targets = [item.answer, ...(item.accept ?? [])].map(fold)
  if (targets.includes(given)) return 'correct'
  if (targets.map(bare).includes(bare(given))) return 'almost'
  return 'wrong'
}

export function itemOptions(ex: GrammarExercise, item: ExerciseItem): string[] {
  return item.options ?? ex.options ?? []
}

// ── Progress ──────────────────────────────────────────────────────────────────
// Stored in user_grammar_progress (src/lib/grammar-progress.ts).

export type ModuleProgress = {
  /** Best first-try score per exercise, 0–100 */
  best: Record<string, number>
  /** Checked self-assessment items (indexes) */
  checklist: number[]
  visited: boolean
}

export type GrammarProgress = Record<string, ModuleProgress>

export const EMPTY_MODULE_PROGRESS: ModuleProgress = { best: {}, checklist: [], visited: false }

export const MASTERY = 80

/** Questions in a mixed review of a module */
export const MIXED_SIZE = 12

// ── Rewards ───────────────────────────────────────────────────────────────────
// Full reward until an exercise is mastered; after that, repeating it (and the
// mixed review) is practice with a small reward. Mastering a whole module pays a
// one-time bonus. XP follows the CLAUDE.md formula: ×1.5 with a 7+ day streak,
// ×2 with the XP boost. Gems are doubled by the database during a gems boost.

export const REWARDS = {
  /** XP by first-try score while the exercise isn't mastered */
  xp: (pct: number) => (pct >= MASTERY ? 15 : pct >= 60 ? 10 : 5),
  /** Gems for mastering an exercise for the first time */
  masteryGems: 2,
  /** XP for a mastered exercise again, or the mixed review */
  practiceXp: 5,
  /** Gems for mastering the whole module (once) */
  moduleGems: 10,
  streakDays: 7,
  streakMultiplier: 1.5,
} as const

export type ExerciseReward = { kind: 'first' | 'practice'; xp: number; gems: number }

/** What a round pays before multipliers. prevBest: the exercise's best score before this round. */
export function exerciseReward(prevBest: number | undefined, pct: number, mixed: boolean): ExerciseReward {
  if (mixed || (prevBest ?? 0) >= MASTERY) return { kind: 'practice', xp: REWARDS.practiceXp, gems: 0 }
  return { kind: 'first', xp: REWARDS.xp(pct), gems: pct >= MASTERY ? REWARDS.masteryGems : 0 }
}

export type XpMultipliers = { streak: number; boost: boolean }

export function applyXpMultipliers(xp: number, m: XpMultipliers): number {
  return Math.round(xp * (m.streak >= REWARDS.streakDays ? REWARDS.streakMultiplier : 1) * (m.boost ? 2 : 1))
}

export function isModuleMastered(exerciseIds: string[], best: Record<string, number>): boolean {
  return exerciseIds.length > 0 && exerciseIds.every(id => (best[id] ?? 0) >= MASTERY)
}

/** Gems still to earn in a module: exercises not mastered, plus the module bonus */
export function gemsLeft(exerciseIds: string[], best: Record<string, number>): number {
  const open = exerciseIds.filter(id => (best[id] ?? 0) < MASTERY).length
  return open * REWARDS.masteryGems + (open > 0 ? REWARDS.moduleGems : 0)
}

export type ModuleStatus = 'new' | 'started' | 'mastered'

export function moduleStatus(entry: Pick<GrammarIndexEntry, 'exercises'>, p: ModuleProgress | undefined): ModuleStatus {
  if (!p) return 'new'
  if (entry.exercises.length > 0 && entry.exercises.every(e => (p.best[e.id] ?? 0) >= MASTERY)) return 'mastered'
  return p.visited || Object.keys(p.best).length > 0 ? 'started' : 'new'
}

export function masteredCount(entry: Pick<GrammarIndexEntry, 'exercises'>, p: ModuleProgress | undefined): number {
  return entry.exercises.filter(e => (p?.best[e.id] ?? 0) >= MASTERY).length
}

// ── Links from the lessons ────────────────────────────────────────────────────

/** Lesson grammar structure (French label) → the module with its theory */
const LESSON_LINKS: { match: RegExp; slug: string; number: number }[] = [
  { match: /partitif/i, slug: 'partitivos', number: 6 },
  { match: /adjectifs? possessifs?/i, slug: 'posesivos', number: 8 },
  { match: /adjectifs? démonstratifs?/i, slug: 'demostrativos', number: 3 },
  { match: /nombres cardinaux/i, slug: 'numeros', number: 7 },
  { match: /^futur proche( \/ futur simple)?$/i, slug: 'verbos-irregulares', number: 9 },
  { match: /^(comparatif|superlatif)$|couleur/i, slug: 'adjetivos', number: 13 },
  { match: /pronoms? « ?(y|en)/i, slug: 'en-y', number: 16 },
  { match: /ne … que|négation \+ de/i, slug: 'negacion', number: 12 },
  { match: /verbes pronominaux|s'appeler/i, slug: 'pronominales', number: 17 },
  { match: /mots interrogatifs|inversion|est-ce que/i, slug: 'preguntas', number: 11 },
  { match: /pronom « le » \(COD\)/i, slug: 'pronombres', number: 15 },
  { match: /genre des noms|féminin des professions/i, slug: 'masculino-femenino', number: 2 },
  { match: /^passé composé( avec être| \(négation\))?$/i, slug: 'passe-compose', number: 10 },
  { match: /^imparfait( \((habitudes|description)\))?$/i, slug: 'imparfait', number: 18 },
]

export function grammarLinkFor(structure: string): { slug: string; number: number } | null {
  const hit = LESSON_LINKS.find(l => l.match.test(structure))
  return hit ? { slug: hit.slug, number: hit.number } : null
}
