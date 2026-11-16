-- Supabase advisor clean-up (performance and security).
--
-- 1. RLS policies called auth.uid() once per row; wrapped in a sub-select it is
--    evaluated once per query (same rule, faster on big tables).
-- 2. Duplicate unique constraints on user_activity and user_progress, and two plain
--    indexes already covered by them.
-- 3. Indexes for foreign keys without one.
-- 4. update_updated_at gets a fixed search_path; the handle_new_user trigger
--    function can't be called through the API.
-- 5. The anonymous role loses table access to per-user tables it never needs
--    (RLS already hid every row from it; this also drops them from its GraphQL
--    schema). Course content (languages, modules, lessons) stays public.

alter policy own_missions_insert on public.daily_missions with check ((select auth.uid()) = user_id);
alter policy own_missions_select on public.daily_missions using ((select auth.uid()) = user_id);
alter policy own_missions_update on public.daily_missions using ((select auth.uid()) = user_id);
alter policy gem_transactions_select_own on public.gem_transactions using ((select auth.uid()) = user_id);
alter policy saved_items_delete_own on public.saved_items using ((select auth.uid()) = user_id);
alter policy saved_items_insert_own on public.saved_items with check ((select auth.uid()) = user_id);
alter policy saved_items_select_own on public.saved_items using ((select auth.uid()) = user_id);
alter policy study_links_delete_own on public.study_links using ((select auth.uid()) = user_id);
alter policy study_links_insert_own on public.study_links with check ((select auth.uid()) = user_id);
alter policy study_links_select_own on public.study_links using ((select auth.uid()) = user_id);
alter policy study_links_update_own on public.study_links using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy user_activity_insert_own on public.user_activity with check ((select auth.uid()) = user_id);
alter policy user_activity_select_own on public.user_activity using ((select auth.uid()) = user_id);
alter policy user_activity_update_own on public.user_activity using ((select auth.uid()) = user_id);
alter policy user_boosts_select_own on public.user_boosts using ((select auth.uid()) = user_id);
alter policy user_languages_insert_own on public.user_languages with check ((select auth.uid()) = user_id);
alter policy user_languages_select_own on public.user_languages using ((select auth.uid()) = user_id);
alter policy user_languages_update_own on public.user_languages using ((select auth.uid()) = user_id);
alter policy user_profiles_insert_own on public.user_profiles with check ((select auth.uid()) = user_id);
alter policy user_profiles_select_own on public.user_profiles using ((select auth.uid()) = user_id);
alter policy user_profiles_update_own on public.user_profiles using ((select auth.uid()) = user_id);
alter policy user_progress_insert_own on public.user_progress with check ((select auth.uid()) = user_id);
alter policy user_progress_select_own on public.user_progress using ((select auth.uid()) = user_id);
alter policy user_progress_update_own on public.user_progress using ((select auth.uid()) = user_id);
alter policy user_unlocked_modules_select_own on public.user_unlocked_modules using ((select auth.uid()) = user_id);
alter policy vocab_mastery_insert on public.user_vocab_mastery with check ((select auth.uid()) = user_id);
alter policy vocab_mastery_select on public.user_vocab_mastery using ((select auth.uid()) = user_id);

alter table public.user_activity drop constraint if exists user_activity_user_date_unique;
alter table public.user_progress drop constraint if exists user_progress_user_lesson_unique;
drop index if exists public.idx_user_activity_user_date;
drop index if exists public.idx_user_progress_user_id;

create index if not exists saved_items_source_lesson_id_idx on public.saved_items (source_lesson_id);
create index if not exists study_groups_created_by_idx on public.study_groups (created_by);
create index if not exists user_languages_language_code_idx on public.user_languages (language_code);
create index if not exists user_profiles_native_language_code_idx on public.user_profiles (native_language_code);
create index if not exists user_profiles_translation_language_code_idx on public.user_profiles (translation_language_code);
create index if not exists user_progress_module_id_idx on public.user_progress (module_id);
create index if not exists user_unlocked_modules_module_id_idx on public.user_unlocked_modules (module_id);

alter function public.update_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['ai_usage', 'daily_missions', 'gem_transactions', 'saved_items', 'study_links', 'study_groups', 'study_group_members', 'user_activity', 'user_boosts', 'user_grammar_progress', 'user_languages', 'user_profiles', 'user_progress', 'user_unlocked_modules', 'user_vocab_mastery']::text[] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon', t);
    end if;
  end loop;
end $$;
