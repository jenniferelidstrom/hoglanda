-- Tillåt borttagning av dagboksanteckningar:
-- den som skrev anteckningen (user_id) ELLER en admin får ta bort.
-- Klistras in i Supabase: SQL Editor -> New query -> kör.

drop policy if exists "delete own or admin" on public.dagbok;
create policy "delete own or admin" on public.dagbok
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
