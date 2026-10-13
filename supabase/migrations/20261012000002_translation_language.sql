-- Language used to show translations of lesson content (e.g. French → Spanish).
-- Null means "same as app_language_code".
alter table public.user_profiles
  add column if not exists translation_language_code text references public.languages(code);
