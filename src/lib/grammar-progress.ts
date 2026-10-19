import type { SupabaseClient } from '@supabase/supabase-js'
import { EMPTY_MODULE_PROGRESS, type GrammarProgress, type ModuleProgress } from '@/lib/grammar'

// /grammar progress lives in user_grammar_progress (one row per user, course and
// module), like the rest of the user's progress. Best scores only go up:
// grammar_record_score keeps the highest one.

type Row = { module_slug: string; best: Record<string, number> | null; checklist: number[] | null; visited_at: string | null }

function fromRow(row: Row): ModuleProgress {
  return { best: row.best ?? {}, checklist: row.checklist ?? [], visited: row.visited_at !== null }
}

export async function loadProgress(supabase: SupabaseClient, lang: string): Promise<GrammarProgress> {
  const { data, error } = await supabase
    .from('user_grammar_progress')
    .select('module_slug, best, checklist, visited_at')
    .eq('language_code', lang)
  if (error) {
    console.error('[grammar progress]', error.message)
    return {}
  }
  return Object.fromEntries((data as Row[]).map(r => [r.module_slug, fromRow(r)]))
}

/** Visit and self-assessment changes. Returns the new state at once; the database write follows. */
export function saveModuleProgress(
  supabase: SupabaseClient,
  userId: string | null,
  lang: string,
  all: GrammarProgress,
  slug: string,
  change: (p: ModuleProgress) => ModuleProgress,
): GrammarProgress {
  const before = all[slug] ?? EMPTY_MODULE_PROGRESS
  const after = change(before)
  if (after === before || !userId) return after === before ? all : { ...all, [slug]: after }
  supabase.from('user_grammar_progress').upsert(
    {
      user_id: userId,
      language_code: lang,
      module_slug: slug,
      checklist: after.checklist,
      // Only on the first visit, so it keeps that date
      ...(after.visited && !before.visited ? { visited_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,language_code,module_slug' },
  ).then(({ error }) => { if (error) console.error('[grammar progress]', error.message) })
  return { ...all, [slug]: after }
}

/** A finished exercise: the module's best scores before and after saving it */
export async function saveScore(
  supabase: SupabaseClient,
  lang: string,
  slug: string,
  exercise: string,
  pct: number,
): Promise<{ before: Record<string, number>; after: Record<string, number> }> {
  const { data: row } = await supabase
    .from('user_grammar_progress')
    .select('best')
    .eq('language_code', lang)
    .eq('module_slug', slug)
    .maybeSingle()
  const before = (row?.best as Record<string, number> | undefined) ?? {}
  const { data, error } = await supabase.rpc('grammar_record_score', { p_language: lang, p_module: slug, p_exercise: exercise, p_score: pct })
  if (error) console.error('[grammar progress]', error.message)
  const after = (data as Record<string, number> | null) ?? { ...before, [exercise]: Math.max(before[exercise] ?? 0, pct) }
  return { before, after }
}
