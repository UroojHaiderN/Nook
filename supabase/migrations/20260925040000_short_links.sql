-- Friendlier board links: #/join/<board-name>-<code> instead of the board's
-- internal id plus a 32-character token. The code alone finds the board, so it
-- has to be unique; the name in front is only there for people to read.

update public.boards
   set invite_token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
 where length(invite_token) > 16;

alter table public.boards
  alter column invite_token set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

create unique index if not exists boards_invite_token_key on public.boards (invite_token);

create or replace function public.join_board_by_code(code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target public.boards;
begin
  if me is null then
    raise exception 'sign in first';
  end if;

  select * into target from public.boards where invite_token = lower(code);
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

revoke all on function public.join_board_by_code(text) from public, anon;
grant execute on function public.join_board_by_code(text) to authenticated;
