-- ============================================================
-- Notiser – databasuppsättning för Höglanda-appen
-- Klistras in i Supabase: SQL Editor -> New query -> kör.
-- ============================================================

-- 1) Prenumerationer: en rad per enhet/webbläsare som tillåtit notiser.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own subs select" on public.push_subscriptions;
create policy "own subs select" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own subs insert" on public.push_subscriptions;
create policy "own subs insert" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own subs update" on public.push_subscriptions;
create policy "own subs update" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own subs delete" on public.push_subscriptions;
create policy "own subs delete" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());


-- 2) Bevakare: vem vill få notis när en viss häst får en dagboksanteckning.
create table if not exists public.diary_watchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  horse text not null,
  created_at timestamptz not null default now(),
  unique(user_id, horse)
);

alter table public.diary_watchers enable row level security;

-- Läsa/hantera: admin sköter bevakningarna (kan utökas senare).
drop policy if exists "watchers select own" on public.diary_watchers;
create policy "watchers select own" on public.diary_watchers
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "watchers admin all" on public.diary_watchers;
create policy "watchers admin all" on public.diary_watchers
  for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));


-- ============================================================
-- 3) SEED (fylls i under vår gemensamma session – exempel):
--    Linnea ska få notis när någon av Jennifers hästar loggas.
--    Byt <LINNEA_USER_ID> och hästlistan mot de riktiga värdena.
-- ============================================================
-- insert into public.diary_watchers (user_id, horse) values
--   ('<LINNEA_USER_ID>', 'Calle'),
--   ('<LINNEA_USER_ID>', 'Lova')
-- on conflict (user_id, horse) do nothing;
