-- Verified profile editing, avatar storage, and per-message points.
-- Run once in Supabase SQL Editor after the chat schema has been applied.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists points integer not null default 0 check (points >= 0);

-- Do not allow members to award themselves points through the public profile update API.
revoke update on public.profiles from authenticated;
grant update (display_name, username, avatar_url) on public.profiles to authenticated;

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Award exactly one point for each successfully inserted message, inside the same transaction.
create or replace function public.award_velos_message_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
    set points = points + 1
    where user_id = new.author_id;
  return new;
end;
$$;
revoke all on function public.award_velos_message_point() from public, anon, authenticated;
drop trigger if exists award_point_for_velos_message on public.messages;
create trigger award_point_for_velos_message
after insert on public.messages
for each row execute function public.award_velos_message_point();

-- Profile pictures are public to display in public chat; only the owner may manage files in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];
drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "Members upload their own avatar" on storage.objects;
create policy "Members upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members update their own avatar" on storage.objects;
create policy "Members update their own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members delete their own avatar" on storage.objects;
create policy "Members delete their own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
