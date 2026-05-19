-- =====================================================================
-- 0001_security_hardening
--
-- Plugs three holes the original policies.sql leaves open:
--
--   1. profiles update self-promotion to admin / self-verification.
--   2. listing-images / avatars storage bucket cross-user writes.
--   3. duplicate conversations for the same (buyer, seller, listing).
--
-- Plus a small RPC for atomic listing.views increment.
--
-- Safe to re-run: every statement is idempotent.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1 · Lock down sensitive profile columns
-- ---------------------------------------------------------------------
-- A WITH CHECK can't compare OLD vs NEW, so we use a BEFORE UPDATE trigger
-- that quietly resets privileged columns when the actor is not an admin.
create or replace function public.profiles_guard_privileged_cols()
returns trigger
language plpgsql
security definer
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- A normal member cannot change their own role, verification, email,
  -- or rating aggregates. Silently preserve OLD so good clients aren't
  -- error-paged by accidental form submissions.
  new.role        := old.role;
  new.is_verified := old.is_verified;
  new.email       := old.email;
  new.rating_avg  := old.rating_avg;
  new.rating_count := old.rating_count;

  return new;
end $$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_cols();


-- ---------------------------------------------------------------------
-- 2 · Storage: scope writes/deletes to the owning user's folder
-- ---------------------------------------------------------------------
-- The original "listing-images upload" policy lets any authed user write
-- to any path. We require the first folder segment to equal auth.uid().
-- Read stays public (these are listing photos / avatars).
drop policy if exists "listing-images upload" on storage.objects;
create policy "listing-images upload"
  on storage.objects for insert
  with check (
    bucket_id in ('listing-images','avatars')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing-images update own" on storage.objects;
create policy "listing-images update own"
  on storage.objects for update
  using (
    bucket_id in ('listing-images','avatars')
    and owner = auth.uid()
  )
  with check (
    bucket_id in ('listing-images','avatars')
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- delete policy already requires owner = auth.uid(); leave it untouched.


-- ---------------------------------------------------------------------
-- 3 · Atomic listing-view counter
-- ---------------------------------------------------------------------
create or replace function public.increment_listing_views(p_listing uuid)
returns void
language sql
security definer
as $$
  update public.listings
     set views = coalesce(views, 0) + 1
   where id = p_listing;
$$;

grant execute on function public.increment_listing_views(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 4 · One conversation per (listing, ordered participants pair)
-- ---------------------------------------------------------------------
-- conversations have no buyer/seller columns; uniqueness lives in
-- participants. We compute a deterministic "pair key" via a helper.
create or replace function public.participants_pair_key(conv uuid)
returns text
language sql
stable
as $$
  select string_agg(user_id::text, '|' order by user_id::text)
    from public.conversation_participants
   where conversation_id = conv;
$$;

-- A partial unique index on (listing_id, pair_key) would be ideal, but
-- pair_key is computed per-row across rows. Instead, enforce via an
-- AFTER INSERT trigger that aborts on collision.
create or replace function public.conversations_dedupe_check()
returns trigger
language plpgsql
as $$
declare
  v_listing uuid;
  v_pair    text;
  v_dupe    int;
begin
  -- Re-read the conversation so we have the freshest listing_id.
  select listing_id into v_listing from public.conversations where id = new.conversation_id;
  if v_listing is null then
    return new;
  end if;

  v_pair := public.participants_pair_key(new.conversation_id);
  -- Only enforce once both participants are present (pair length > 1)
  if v_pair is null or position('|' in v_pair) = 0 then
    return new;
  end if;

  select count(*) into v_dupe
    from public.conversations c
   where c.listing_id = v_listing
     and c.id <> new.conversation_id
     and public.participants_pair_key(c.id) = v_pair;

  if v_dupe > 0 then
    raise exception 'duplicate_conversation' using errcode = '23505';
  end if;

  return new;
end $$;

drop trigger if exists conversations_dedupe on public.conversation_participants;
create trigger conversations_dedupe
  after insert on public.conversation_participants
  for each row execute function public.conversations_dedupe_check();
