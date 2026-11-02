-- Saving a new board failed: an upsert must also pass the SELECT policy on the
-- row it writes, and can_read_board() looks the board up in the table — where
-- a row being inserted is not yet. Checking the owner column on the row itself
-- first lets the owner's own write through; everyone else still goes through
-- the membership lookup.

drop policy if exists "read own and shared boards" on public.boards;
create policy "read own and shared boards" on public.boards
  for select using (owner = auth.uid() or public.can_read_board(id));

drop policy if exists "update own and shared boards" on public.boards;
create policy "update own and shared boards" on public.boards
  for update using (owner = auth.uid() or public.can_read_board(id))
  with check (owner = auth.uid() or public.can_read_board(id));
