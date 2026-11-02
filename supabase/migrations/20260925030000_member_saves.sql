-- A member saving a shared board also failed: an upsert checks the INSERT
-- policy against the row even when it ends up updating, and that policy only
-- allowed the owner. Letting through rows for boards you can already read is
-- safe — a brand-new id has no board and so no members, so only its owner can
-- create it.

drop policy if exists "insert own boards" on public.boards;
create policy "insert own boards" on public.boards
  for insert with check (owner = auth.uid() or public.can_read_board(id));
