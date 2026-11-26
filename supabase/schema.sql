-- Enable this extension once per project; Supabase usually enables it by default.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default 'Velos member',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null constraint posts_author_id_fkey references public.profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 4 and 140),
  body text not null default '' check (char_length(body) <= 5000),
  space text not null check (space in ('Engineering', 'AI & ML', 'Design', 'Career', 'Show & Tell')),
  score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null constraint comments_author_id_fkey references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.post_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_score_idx on public.posts(score desc);
create index if not exists posts_space_created_at_idx on public.posts(space, created_at desc);
create index if not exists comments_post_created_at_idx on public.comments(post_id, created_at);

create or replace function public.create_velos_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_name text;
begin
  chosen_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Velos member');
  insert into public.profiles (user_id, username, display_name)
  values (new.id, 'member_' || substr(replace(new.id::text, '-', ''), 1, 10), left(chosen_name, 40))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_velos_user_created on auth.users;
create trigger on_velos_user_created after insert on auth.users for each row execute function public.create_velos_profile();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_votes enable row level security;
grant select on public.profiles, public.posts, public.comments to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.comments to authenticated;
grant select on public.post_votes to authenticated;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Posts are public" on public.posts;
create policy "Posts are public" on public.posts for select using (true);
drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts" on public.posts for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "Authors can update their posts" on public.posts;
create policy "Authors can update their posts" on public.posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Authors can delete their posts" on public.posts;
create policy "Authors can delete their posts" on public.posts for delete to authenticated using (auth.uid() = author_id);
drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public" on public.comments for select using (true);
drop policy if exists "Authenticated users can reply" on public.comments;
create policy "Authenticated users can reply" on public.comments for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "Authors can delete their comments" on public.comments;
create policy "Authors can delete their comments" on public.comments for delete to authenticated using (auth.uid() = author_id);
alter table public.post_votes enable row level security;
drop policy if exists "Users can read their own votes" on public.post_votes;
create policy "Users can read their own votes" on public.post_votes for select to authenticated using (auth.uid() = user_id);

create or replace function public.toggle_post_vote(p_post_id uuid, p_value smallint)
returns integer language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); existing_value smallint; resulting_score integer;
begin
  if current_user_id is null then raise exception 'Sign in to vote.'; end if;
  if p_value not in (-1, 1) then raise exception 'Vote must be -1 or 1.'; end if;
  perform 1 from public.posts where id = p_post_id for update;
  if not found then raise exception 'Post not found.'; end if;
  select value into existing_value from public.post_votes where post_id = p_post_id and user_id = current_user_id;
  if existing_value is null then
    insert into public.post_votes(post_id, user_id, value) values (p_post_id, current_user_id, p_value);
    update public.posts set score = score + p_value where id = p_post_id returning score into resulting_score;
  elsif existing_value = p_value then
    delete from public.post_votes where post_id = p_post_id and user_id = current_user_id;
    update public.posts set score = score - existing_value where id = p_post_id returning score into resulting_score;
  else
    update public.post_votes set value = p_value where post_id = p_post_id and user_id = current_user_id;
    update public.posts set score = score + (2 * p_value) where id = p_post_id returning score into resulting_score;
  end if;
  return resulting_score;
end;
$$;
revoke all on function public.toggle_post_vote(uuid, smallint) from public;
grant execute on function public.toggle_post_vote(uuid, smallint) to authenticated;

-- Velos public chat rooms (spaces).
create table if not exists public.spaces (
  id text primary key check (id in ('artificial-intelligence','careers','fitness','investing','prediction-markets','trading')),
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);
insert into public.spaces (id, name, description) values
 ('artificial-intelligence','Artificial intelligence','Ideas, tools, and the future of intelligent machines.'),
 ('careers','Careers','Work, growth, interviews, and finding your next move.'),
 ('fitness','Fitness','Training, health, and the habits that keep us moving.'),
 ('investing','Investing','Long-term thinking about markets, money, and risk.'),
 ('prediction-markets','Prediction markets','Forecasts, probabilities, and what the crowd thinks.'),
 ('trading','Trading','Strategies, market structure, and trading tools.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  space_id text not null references public.spaces(id) on delete cascade,
  author_id uuid not null constraint messages_author_id_fkey references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_space_created_idx on public.messages(space_id, created_at);
alter table public.spaces enable row level security;
alter table public.messages enable row level security;
grant select on public.spaces to anon, authenticated;
grant select on public.messages to anon, authenticated;
grant insert on public.messages to authenticated;
drop policy if exists "Spaces are public" on public.spaces;
create policy "Spaces are public" on public.spaces for select using (true);
drop policy if exists "Messages are public" on public.messages;
create policy "Messages are public" on public.messages for select using (true);
drop policy if exists "Signed in members can chat" on public.messages;
create policy "Signed in members can chat" on public.messages for insert to authenticated with check (auth.uid() = author_id);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
