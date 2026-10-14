-- Links users save as study material (YouTube, TikTok, Instagram videos with tips…)
create table if not exists public.study_links (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  language_code text not null,
  url           text not null check (url ~* '^https?://' and length(url) <= 2048),
  platform      text not null check (platform in ('youtube', 'tiktok', 'instagram', 'other')),
  title         text check (length(title) <= 300),
  author        text check (length(author) <= 200),
  thumbnail_url text check (thumbnail_url ~* '^https://' and length(thumbnail_url) <= 2048),
  category      text not null default 'other'
                check (category in ('vocabulary', 'pronunciation', 'grammar', 'tip', 'other')),
  note          text check (length(note) <= 500),
  created_at    timestamptz not null default now(),
  unique (user_id, url)
);

create index if not exists study_links_user_lang_idx on public.study_links (user_id, language_code, created_at desc);

alter table public.study_links enable row level security;

create policy study_links_select_own on public.study_links for select using (auth.uid() = user_id);
create policy study_links_insert_own on public.study_links for insert with check (auth.uid() = user_id);
create policy study_links_update_own on public.study_links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy study_links_delete_own on public.study_links for delete using (auth.uid() = user_id);
