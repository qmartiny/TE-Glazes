-- ===========================================================================
-- Glaze Book — database schema
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run again (e.g. after pulling an update).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Profiles: one per signed-up user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  studio text check (char_length(studio) <= 60),
  bio text check (char_length(bio) <= 500),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- The site is members-only: only signed-in members can see anything.
drop policy if exists "Profiles are visible to everyone" on public.profiles;
drop policy if exists "Profiles are visible to members" on public.profiles;
create policy "Profiles are visible to members"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up code: when one is set, new accounts need it (share it at the
-- studio). Set or change it in the SQL editor, not in this file (it's public):
--   update public.studio_settings set signup_code = 'your-code-here';
-- Set it back to null to let anyone sign up. Capitals don't matter.
-- ---------------------------------------------------------------------------
create table if not exists public.studio_settings (
  id int primary key default 1 check (id = 1),
  signup_code text
);
insert into public.studio_settings (id) values (1) on conflict (id) do nothing;

-- No policies or grants: the code can't be read through the API, only checked.
alter table public.studio_settings enable row level security;
revoke all on public.studio_settings from anon, authenticated;

create or replace function public.signup_code_required()
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select coalesce(trim(signup_code), '') <> '' from public.studio_settings where id = 1;
$$;

create or replace function public.check_signup_code(code text)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select coalesce(trim(s.signup_code), '') = '' or lower(trim(coalesce(code, ''))) = lower(trim(s.signup_code))
  from public.studio_settings s
  where s.id = 1;
$$;

grant execute on function public.signup_code_required() to anon, authenticated;
grant execute on function public.check_signup_code(text) to anon, authenticated;

-- Runs before every new account, however it's created through the API.
create or replace function public.check_new_user_code()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.check_signup_code(new.raw_user_meta_data ->> 'signup_code') then
    raise exception 'Wrong sign-up code' using errcode = 'P0001';
  end if;
  -- Don't keep the code on the account.
  new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'signup_code';
  return new;
end;
$$;

revoke execute on function public.check_new_user_code() from public, anon, authenticated;

drop trigger if exists check_signup_code on auth.users;
create trigger check_signup_code
  before insert on auth.users
  for each row execute procedure public.check_new_user_code();

-- Create the profile automatically from the name/studio given at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, studio)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Potter'
    ), 60),
    left(nullif(trim(new.raw_user_meta_data ->> 'studio'), ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Studio team: members who can post the official studio test tiles.
-- Only the SQL editor can change who's on it, e.g.:
--   insert into public.studio_admins (user_id)
--   select id from auth.users where email = 'someone@example.com';
-- ---------------------------------------------------------------------------
create table if not exists public.studio_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.studio_admins enable row level security;

drop policy if exists "The studio team is visible to everyone" on public.studio_admins;
drop policy if exists "The studio team is visible to members" on public.studio_admins;
create policy "The studio team is visible to members"
  on public.studio_admins for select to authenticated
  using (true);

revoke all on public.studio_admins from anon;
grant select on public.studio_admins to authenticated;

create or replace function public.is_studio_admin()
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.studio_admins a where a.user_id = (select auth.uid()));
$$;

-- Delete your own account (from Settings). Your profile, posts and studio
-- team membership go with it; the app removes your photos first.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Combinations: a glaze combo with photos, clay, firing and notes
-- ---------------------------------------------------------------------------
create table if not exists public.combinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text check (char_length(title) <= 120), -- no longer used: combos are named after their layers
  clay text not null check (char_length(clay) between 1 and 80),
  firing text not null check (firing in ('oxidation', 'reduction')),
  studio text check (char_length(studio) <= 60), -- no longer used: studio lives on the profile
  -- Ordered layers, first applied first:
  -- [{"type": "slip", "name": "Blue", "application": "Brushed"}, {"type": "glaze", "name": "Tenmoku", ...}, ...]
  layers jsonb not null check (
    jsonb_typeof(layers) = 'array' and jsonb_array_length(layers) between 1 and 8 and length(layers::text) <= 2000
  ),
  description text check (char_length(description) <= 2000),
  -- [{"path": "...", "thumb": "...", "width": 1600, "height": 1200}, ...]
  photos jsonb not null default '[]' check (
    jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 6 and length(photos::text) <= 4000
  ),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Added later; "add column if not exists" also upgrades older databases.
-- Clays, usually one, several for a mix:
-- [{"name": "Craft Crank", "percent": 50}, {"name": "Reclaim", "percent": 50}]
-- (`clay` above keeps a readable label, e.g. "50% Craft Crank + 50% Reclaim".)
alter table public.combinations add column if not exists clays jsonb;
-- A studio test tile, posted by the studio team.
alter table public.combinations add column if not exists official boolean not null default false;

create index if not exists combinations_created_at_idx on public.combinations (created_at desc);
create index if not exists combinations_user_id_idx on public.combinations (user_id);
create index if not exists combinations_layers_idx on public.combinations using gin (layers jsonb_path_ops);

-- Timestamps are set by the database, so nobody can back- or future-date a combo.
create or replace function public.set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
  else
    new.created_at = old.created_at;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists combinations_set_timestamps on public.combinations;
create trigger combinations_set_timestamps
  before insert or update on public.combinations
  for each row execute procedure public.set_timestamps();

-- At most 20 new posts a day each, to limit spam (the studio team has no limit,
-- for adding test tiles).
create or replace function public.limit_daily_posts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.is_studio_admin() then
    return new;
  end if;
  if (
    select count(*) from public.combinations c
    where c.user_id = new.user_id and c.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'You’ve added 20 posts in the last day, the most allowed. Try again tomorrow.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_daily_posts() from public, anon, authenticated;

drop trigger if exists combinations_daily_limit on public.combinations;
create trigger combinations_daily_limit
  before insert on public.combinations
  for each row execute procedure public.limit_daily_posts();

-- Slips & oxides: layers used to be {"glaze": "...", "application": ...}.
-- Convert any combos saved that way, then only accept the new format.
update public.combinations c
set layers = (
  select jsonb_agg(
    case
      when l ? 'name' then l
      else jsonb_build_object('type', 'glaze', 'name', l ->> 'glaze', 'application', l -> 'application')
    end
    order by ord)
  from jsonb_array_elements(c.layers) with ordinality as t(l, ord)
)
where jsonb_path_exists(c.layers, '$[*] ? (!(exists(@.name)))');

alter table public.combinations drop constraint if exists combinations_layers_shape;
alter table public.combinations add constraint combinations_layers_shape check (
  not jsonb_path_exists(
    layers,
    '$[*] ? (!(@.type == "glaze" || @.type == "slip" || @.type == "oxide") || !(@.name.type() == "string"))'
  )
);

-- Clay mixes: fill in `clays` for combos saved with a single clay, and allow
-- longer labels for mixes.
update public.combinations
set clays = jsonb_build_array(jsonb_build_object('name', clay, 'percent', null))
where clays is null;

alter table public.combinations drop constraint if exists combinations_clay_check;
alter table public.combinations add constraint combinations_clay_check check (char_length(clay) between 1 and 300);

alter table public.combinations drop constraint if exists combinations_clays_shape;
alter table public.combinations add constraint combinations_clays_shape check (
  clays is null or (
    jsonb_typeof(clays) = 'array'
    and jsonb_array_length(clays) between 1 and 4
    and length(clays::text) <= 1000
    and not jsonb_path_exists(
      clays,
      '$[*] ? (!(@.name.type() == "string") || (@.percent.type() == "number" && (@.percent < 1 || @.percent > 100)))'
    )
  )
);

-- Studio test tiles are always shared.
alter table public.combinations drop constraint if exists combinations_official_shared;
alter table public.combinations add constraint combinations_official_shared check (not (official and is_private));

alter table public.combinations enable row level security;

-- Members can see shared combos; private ones are only visible to the
-- person who made them.
drop policy if exists "Shared combos are visible to everyone" on public.combinations;
drop policy if exists "Shared combos are visible to members" on public.combinations;
create policy "Shared combos are visible to members"
  on public.combinations for select to authenticated
  using (not is_private or user_id = (select auth.uid()));

drop policy if exists "Users can add their own combos" on public.combinations;
-- Only the studio team can post (or turn a post into) a studio test tile.
create policy "Users can add their own combos"
  on public.combinations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (not official or (select public.is_studio_admin()))
  );

drop policy if exists "Users can edit their own combos" on public.combinations;
create policy "Users can edit their own combos"
  on public.combinations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (not official or (select public.is_studio_admin()))
  );

-- People delete their own; the studio team can also remove any shared post (moderation).
drop policy if exists "Users can delete their own combos" on public.combinations;
drop policy if exists "Users delete their own combos; the studio team any shared one" on public.combinations;
create policy "Users delete their own combos; the studio team any shared one"
  on public.combinations for delete to authenticated
  using (user_id = (select auth.uid()) or (not is_private and (select public.is_studio_admin())));

revoke all on public.combinations from anon;
grant select on public.combinations to authenticated;
grant insert, update, delete on public.combinations to authenticated;

-- The studio team can move someone's shared post to the studio test tiles
-- (one glaze on its own), or back, without being able to change anything else.
create or replace function public.set_studio_tile(post_id uuid, tile boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_studio_admin() then
    raise exception 'Only the studio team can move posts';
  end if;
  update public.combinations c set official = tile
  where c.id = post_id
    and not c.is_private
    and (not tile or (jsonb_array_length(c.layers) = 1 and c.layers -> 0 ->> 'type' = 'glaze'));
  if not found then
    raise exception 'Only a shared post of one glaze on its own can be a studio test tile';
  end if;
end;
$$;

revoke execute on function public.set_studio_tile(uuid, boolean) from public, anon;
grant execute on function public.set_studio_tile(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Photo storage: public-read bucket, each user writes only to <their id>/...
-- Files have long random names, which only members can see (in posts), and
-- listing the bucket needs signing in.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files uploaded to your folder in the last day (each photo is two: full size and thumbnail).
create or replace function public.photos_uploaded_today()
returns bigint
language sql stable
security definer set search_path = ''
as $$
  select count(*) from storage.objects o
  where o.bucket_id = 'photos'
    and (storage.foldername(o.name))[1] = (select auth.uid()::text)
    and o.created_at > now() - interval '1 day';
$$;

-- At most 300 files a day each (20 posts × 6 photos × 2 is 240); none for the studio team.
drop policy if exists "photos: users upload to their own folder" on storage.objects;
create policy "photos: users upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and ((select public.is_studio_admin()) or (select public.photos_uploaded_today()) < 300)
  );

-- Deleting through the API needs select as well as delete.
-- The studio team can also remove anyone's photos, when removing a post.
drop policy if exists "photos: users see their own files" on storage.objects;
create policy "photos: users see their own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or (select public.is_studio_admin()))
  );

drop policy if exists "photos: users delete their own files" on storage.objects;
create policy "photos: users delete their own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or (select public.is_studio_admin()))
  );
