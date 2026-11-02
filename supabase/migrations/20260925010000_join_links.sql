-- Invite by link instead of by email.
--
-- Every board carries a secret token. The board's link includes it; whoever
-- opens that link and signs in is added to the board. Resetting the token
-- kills every link handed out before.

alter table public.boards
  add column if not exists invite_token text not null
    default replace(gen_random_uuid()::text, '-', '');

-- Whoever joins needs to see who owns the board, so the owner's address is kept on it.
alter table public.boards
  add column if not exists owner_email text default public.current_email();

update public.boards b
   set owner_email = lower(u.email)
  from auth.users u
 where u.id = b.owner and b.owner_email is null;

-- Joined by link means a user id on the membership, not just an address.
create or replace function public.can_read_board(board text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.boards b where b.id = board and b.owner = auth.uid())
      or exists (
        select 1 from public.board_members m
        where m.board_id = board
          and (m.user_id = auth.uid() or lower(m.email) = public.current_email())
      )
$$;

-- The only way in with a link. Security definer because the person joining
-- cannot read the board yet; the token is what proves they were sent it.
create or replace function public.join_board(board text, token text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target public.boards;
begin
  if me is null then
    raise exception 'sign in first';
  end if;

  select * into target from public.boards where id = board and invite_token = token;
  if not found then
    return null;
  end if;

  if target.owner <> me then
    insert into public.board_members (board_id, email, user_id, invited_by)
    values (target.id, public.current_email(), me, target.owner)
    on conflict (board_id, email) do update set user_id = excluded.user_id;
  end if;

  return target.id;
end $$;

revoke all on function public.join_board(text, text) from public, anon;
grant execute on function public.join_board(text, text) to authenticated;
