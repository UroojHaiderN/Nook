-- Nook schema. Paste this into the Supabase SQL editor and run it once.
--
-- Two tables: a board document, and who is on it. Row level security is what
-- actually keeps one household's list out of another's, so every policy below
-- matters — do not disable RLS to "debug" something.

create table if not exists public.boards (
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb
);

create table if not exists public.board_members (
  board_id    text not null references public.boards (id) on delete cascade,
  email       text not null,
  user_id     uuid references auth.users (id) on delete set null,
  invited_by  uuid references auth.users (id) on delete set null,
  invited_at  timestamptz not null default now(),
  primary key (board_id, email)
);

create index if not exists board_members_email_idx on public.board_members (lower(email));
create index if not exists boards_owner_idx on public.boards (owner);

alter table public.boards enable row level security;
alter table public.board_members enable row level security;

-- The address the current request is authenticated as.
create or replace function public.current_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- True when the signed-in user owns the board or has been invited to it.
create or replace function public.can_read_board(board text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.boards b where b.id = board and b.owner = auth.uid())
      or exists (
        select 1 from public.board_members m
        where m.board_id = board and lower(m.email) = public.current_email()
      )
$$;

drop policy if exists "read own and shared boards" on public.boards;
create policy "read own and shared boards" on public.boards
  for select using (public.can_read_board(id));

drop policy if exists "insert own boards" on public.boards;
create policy "insert own boards" on public.boards
  for insert with check (owner = auth.uid());

-- Anyone on the board may edit it; that is the point of sharing a shopping list.
drop policy if exists "update own and shared boards" on public.boards;
create policy "update own and shared boards" on public.boards
  for update using (public.can_read_board(id)) with check (public.can_read_board(id));

-- Only the owner can delete the board itself.
drop policy if exists "owner deletes boards" on public.boards;
create policy "owner deletes boards" on public.boards
  for delete using (owner = auth.uid());

drop policy if exists "read members of readable boards" on public.board_members;
create policy "read members of readable boards" on public.board_members
  for select using (public.can_read_board(board_id));

drop policy if exists "board people manage members" on public.board_members;
create policy "board people manage members" on public.board_members
  for all using (public.can_read_board(board_id)) with check (public.can_read_board(board_id));

-- Keep updated_at honest no matter which client wrote the row.
create or replace function public.touch_board() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists boards_touch on public.boards;
create trigger boards_touch before update on public.boards
  for each row execute function public.touch_board();

-- When someone signs up, attach any invitations already waiting on their address.
create or replace function public.claim_invitations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.board_members
     set user_id = new.id
   where lower(email) = lower(new.email) and user_id is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.claim_invitations();
