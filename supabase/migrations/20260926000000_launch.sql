-- Launch: shared voice recordings, and deleting your own account.

-- Voice notes were only playable on the device that recorded them. They now
-- go to a private bucket, filed as <board id>/<clip id>, and the board's own
-- membership rule decides who may hear, add or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 10485760, array['audio/*'])
on conflict (id) do nothing;

drop policy if exists "board people hear voice" on storage.objects;
create policy "board people hear voice" on storage.objects
  for select to authenticated
  using (bucket_id = 'voice' and public.can_read_board(split_part(name, '/', 1)));

drop policy if exists "board people add voice" on storage.objects;
create policy "board people add voice" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'voice' and public.can_read_board(split_part(name, '/', 1)));

drop policy if exists "board people replace voice" on storage.objects;
create policy "board people replace voice" on storage.objects
  for update to authenticated
  using (bucket_id = 'voice' and public.can_read_board(split_part(name, '/', 1)));

drop policy if exists "board people remove voice" on storage.objects;
create policy "board people remove voice" on storage.objects
  for delete to authenticated
  using (bucket_id = 'voice' and public.can_read_board(split_part(name, '/', 1)));

-- Delete my account. Boards you own go with it (they cascade from auth.users);
-- your place on other people's boards is removed; their boards stay theirs.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  delete from public.board_members
   where user_id = me or lower(email) = public.current_email();
  delete from auth.users where id = me;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
