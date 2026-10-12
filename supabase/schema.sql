-- ===========================================================================
-- TE Glazes — database schema
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

drop policy if exists "Profiles are visible to everyone" on public.profiles;
create policy "Profiles are visible to everyone"
  on public.profiles for select
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

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

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
-- Combinations: a glaze combo with photos, clay, firing and notes
-- ---------------------------------------------------------------------------
create table if not exists public.combinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text check (char_length(title) <= 120),
  clay text not null check (char_length(clay) between 1 and 80),
  firing text not null check (firing in ('oxidation', 'reduction')),
  studio text check (char_length(studio) <= 60),
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

alter table public.combinations enable row level security;

-- Anyone can browse shared combos (no sign-in needed); private ones are
-- only visible to the person who made them.
drop policy if exists "Shared combos are visible to everyone" on public.combinations;
create policy "Shared combos are visible to everyone"
  on public.combinations for select
  using (not is_private or user_id = (select auth.uid()));

drop policy if exists "Users can add their own combos" on public.combinations;
create policy "Users can add their own combos"
  on public.combinations for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can edit their own combos" on public.combinations;
create policy "Users can edit their own combos"
  on public.combinations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own combos" on public.combinations;
create policy "Users can delete their own combos"
  on public.combinations for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.combinations to anon, authenticated;
grant insert, update, delete on public.combinations to authenticated;

-- ---------------------------------------------------------------------------
-- Photo storage: public-read bucket, each user writes only to <their id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos: users upload to their own folder" on storage.objects;
create policy "photos: users upload to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Deleting through the API needs select as well as delete.
drop policy if exists "photos: users see their own files" on storage.objects;
create policy "photos: users see their own files"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "photos: users delete their own files" on storage.objects;
create policy "photos: users delete their own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
