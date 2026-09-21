-- ============================================================
-- Visningsnamn per användare (för dagbok + notiser)
-- Egen tabell (rör INTE profiles/role) så ingen kan höja sin behörighet.
-- Klistras in i Supabase: SQL Editor -> New query -> kör.
-- ============================================================

create table if not exists public.user_names (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_names enable row level security;

-- Man får bara läsa/skapa/ändra/ta bort sitt EGET namn.
drop policy if exists "read own name" on public.user_names;
create policy "read own name" on public.user_names
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "insert own name" on public.user_names;
create policy "insert own name" on public.user_names
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own name" on public.user_names;
create policy "update own name" on public.user_names
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own name" on public.user_names;
create policy "delete own name" on public.user_names
  for delete to authenticated using (user_id = auth.uid());
