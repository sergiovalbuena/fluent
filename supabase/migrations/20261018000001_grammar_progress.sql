-- Progress in /grammar: one row per user, course language and module.
--   best       exercise id → best first-try score (0–100); only ever goes up
--   checklist  indexes of the self-assessment items the user ticked
create table if not exists public.user_grammar_progress (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  language_code text not null check (language_code ~ '^[a-z]{2}$'),
  module_slug   text not null check (module_slug ~ '^[a-z0-9-]{1,60}$'),
  best          jsonb not null default '{}'::jsonb check (jsonb_typeof(best) = 'object'),
  checklist     smallint[] not null default '{}' check (cardinality(checklist) <= 50),
  visited_at    timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, language_code, module_slug)
);

alter table public.user_grammar_progress enable row level security;

create policy user_grammar_progress_select_own on public.user_grammar_progress
  for select using ((select auth.uid()) = user_id);
create policy user_grammar_progress_insert_own on public.user_grammar_progress
  for insert with check ((select auth.uid()) = user_id);
create policy user_grammar_progress_update_own on public.user_grammar_progress
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Records a score, keeping the best one per exercise (atomic, no read-modify-write
-- on the client). Runs with the caller's rights, so RLS still applies.
create or replace function public.grammar_record_score(
  p_language text,
  p_module text,
  p_exercise text,
  p_score integer
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_best jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'invalid_score';
  end if;
  if p_exercise !~ '^[a-z0-9-]{1,60}$' then
    raise exception 'invalid_exercise';
  end if;

  insert into public.user_grammar_progress as g (user_id, language_code, module_slug, best, visited_at)
  values (v_user, p_language, p_module, jsonb_build_object(p_exercise, p_score), now())
  on conflict (user_id, language_code, module_slug) do update
    set best = g.best || jsonb_build_object(
          p_exercise,
          greatest(coalesce((g.best ->> p_exercise)::int, 0), p_score)
        ),
        visited_at = coalesce(g.visited_at, now()),
        updated_at = now()
  returning g.best into v_best;

  return v_best;
end;
$$;

revoke execute on function public.grammar_record_score(text, text, text, integer) from public, anon;
grant execute on function public.grammar_record_score(text, text, text, integer) to authenticated;

-- Signed-out visitors have nothing to read here
revoke all on table public.user_grammar_progress from anon;
