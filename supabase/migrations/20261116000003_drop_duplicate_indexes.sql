-- Duplicate unique constraints on user_activity and user_progress (two of each on
-- the same columns), and two plain indexes already covered by the remaining ones.
-- Split from 20261116000001_advisor_cleanup.sql because dropping needs a manual
-- confirmation. NOT APPLIED YET: harmless meanwhile (only some extra space and
-- slightly slower writes).

alter table public.user_activity drop constraint if exists user_activity_user_date_unique;
alter table public.user_progress drop constraint if exists user_progress_user_lesson_unique;
drop index if exists public.idx_user_activity_user_date;
drop index if exists public.idx_user_progress_user_id;

