-- =====================================================================
-- PetroConnect — Combined migration (paste into Supabase SQL editor).
-- Order: schema → policies → functions → ai → trust_system → trade_loop → payments → seed.
-- Idempotent — safe to re-run.
-- =====================================================================

-- ---- schema.sql ----
-- =====================================================================
-- PetroConnect — Database schema
-- Run inside Supabase SQL editor (or via supabase db push).
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type k_company as enum (
    'KPC','KOC','KNPC','KIPIC','PIC','KGOC','KUFPEC','KOTC','KAFCO','Q8','OTHER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_kind as enum ('product','service','service_request');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_condition as enum ('new','like_new','good','fair','for_parts');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('draft','active','paused','sold','removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open','reviewing','resolved','dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('member','admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES — mirrors auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text,
  avatar_url   text,
  phone        text,
  company      k_company,
  department   text,
  job_title    text,
  bio          text,
  is_verified  boolean not null default false,
  role         user_role not null default 'member',
  rating_avg   numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CATEGORIES — products + services
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  kind        listing_kind not null,
  icon        text,
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------------
-- LISTINGS — products, services, service requests
-- ---------------------------------------------------------------------
create table if not exists public.listings (
  id           uuid primary key default uuid_generate_v4(),
  seller_id    uuid not null references public.profiles(id) on delete cascade,
  kind         listing_kind not null default 'product',
  title        text not null,
  description  text not null,
  category_id  uuid references public.categories(id) on delete set null,
  condition    listing_condition,
  price_kwd    numeric(10,3),
  is_negotiable boolean not null default false,
  location     text,
  images       text[] not null default '{}',
  status       listing_status not null default 'active',
  is_featured  boolean not null default false,
  views        int not null default 0,
  ai_score     numeric(4,3),
  ai_flags     jsonb,
  search_tsv   tsvector,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists listings_seller_idx on public.listings(seller_id);
create index if not exists listings_category_idx on public.listings(category_id);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_kind_idx on public.listings(kind);
create index if not exists listings_created_idx on public.listings(created_at desc);
create index if not exists listings_search_idx on public.listings using gin(search_tsv);

create or replace function public.listings_tsv_trigger() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.location,'')), 'C');
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists listings_tsv_update on public.listings;
create trigger listings_tsv_update
  before insert or update on public.listings
  for each row execute function public.listings_tsv_trigger();

-- ---------------------------------------------------------------------
-- FAVORITES
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------
-- CONVERSATIONS + PARTICIPANTS + MESSAGES
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id           uuid primary key default uuid_generate_v4(),
  listing_id   uuid references public.listings(id) on delete set null,
  last_message text,
  last_message_at timestamptz default now(),
  created_at   timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists cp_user_idx on public.conversation_participants(user_id);

create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages(conversation_id, created_at desc);

create or replace function public.messages_after_insert() returns trigger as $$
begin
  update public.conversations
     set last_message = left(new.body, 200),
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end $$ language plpgsql;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- ---------------------------------------------------------------------
-- REPORTS
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  listing_id   uuid references public.listings(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  reason       text not null,
  details      text,
  status       report_status not null default 'open',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  data        jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- AI RECOMMENDATIONS — cached per-user lists for the feed
-- ---------------------------------------------------------------------
create table if not exists public.ai_recommendations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  score       numeric(4,3) not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (user_id, listing_id)
);

-- ---------------------------------------------------------------------
-- AUTH TRIGGER — bootstrap a profile when a user signs up
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- IMPORTANT: supabase_auth_admin (the role that triggers this) has a stricter
-- search_path than postgres, so we set it explicitly and fully-qualify every
-- enum cast. Otherwise the function works in psql but fails on real signups.
set search_path = public, pg_catalog
as $$
declare
  v_company public.k_company;
  v_domain text;
  v_admin_emails text := coalesce(current_setting('app.admin_emails', true), '');
begin
  v_domain := lower(split_part(new.email, '@', 2));

  v_company := case
    when v_domain like '%kpc.com.kw'   then 'KPC'::public.k_company
    when v_domain like '%kockw.com'    then 'KOC'::public.k_company
    when v_domain like '%knpc.com'     then 'KNPC'::public.k_company
    when v_domain like '%kipic.com.kw' then 'KIPIC'::public.k_company
    when v_domain like '%pic.com.kw'   then 'PIC'::public.k_company
    when v_domain like '%kgoc.com'     then 'KGOC'::public.k_company
    when v_domain like '%kufpec.com'   then 'KUFPEC'::public.k_company
    when v_domain like '%kotc.com.kw'  then 'KOTC'::public.k_company
    when v_domain like '%kafco.com.kw' then 'KAFCO'::public.k_company
    when v_domain like '%q8.com'       then 'Q8'::public.k_company
    else null
  end;

  insert into public.profiles (id, email, full_name, company, is_verified, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_company,
    v_company is not null,
    case when position(new.email in v_admin_emails) > 0
         then 'admin'::public.user_role else 'member'::public.user_role end
  )
  on conflict (id) do nothing;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- policies.sql ----
-- =====================================================================
-- PetroConnect — Row Level Security
-- =====================================================================

alter table public.profiles                  enable row level security;
alter table public.categories                enable row level security;
alter table public.listings                  enable row level security;
alter table public.favorites                 enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;
alter table public.reports                   enable row level security;
alter table public.notifications             enable row level security;
alter table public.ai_recommendations        enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin() returns boolean
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Helper: is the calling user a participant in this conversation?
-- SECURITY DEFINER so it can scan conversation_participants without
-- being filtered by that table's own RLS policy (which would otherwise
-- recurse and silently return zero rows).
create or replace function public.is_conversation_member(p_conv uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select exists(
    select 1 from public.conversation_participants
    where conversation_id = p_conv and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- CATEGORIES (public read)
-- ---------------------------------------------------------------------
drop policy if exists "categories public read" on public.categories;
create policy "categories public read"
  on public.categories for select using (true);

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write"
  on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- LISTINGS — anyone signed in can browse active items
-- ---------------------------------------------------------------------
drop policy if exists "listings read active" on public.listings;
create policy "listings read active"
  on public.listings for select
  using (
    status = 'active'
    or seller_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "listings insert own" on public.listings;
create policy "listings insert own"
  on public.listings for insert
  with check (
    auth.uid() = seller_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_verified = true
    )
  );

drop policy if exists "listings update own" on public.listings;
create policy "listings update own"
  on public.listings for update
  using (auth.uid() = seller_id or public.is_admin())
  with check (auth.uid() = seller_id or public.is_admin());

drop policy if exists "listings delete own" on public.listings;
create policy "listings delete own"
  on public.listings for delete
  using (auth.uid() = seller_id or public.is_admin());

-- ---------------------------------------------------------------------
-- FAVORITES
-- ---------------------------------------------------------------------
drop policy if exists "favorites self" on public.favorites;
create policy "favorites self"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- CONVERSATIONS / PARTICIPANTS / MESSAGES
-- ---------------------------------------------------------------------
drop policy if exists "conversations read participant" on public.conversations;
create policy "conversations read participant"
  on public.conversations for select
  using (
    public.is_conversation_member(id)
    or public.is_admin()
  );

drop policy if exists "conversations insert any" on public.conversations;
create policy "conversations insert any"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "cp read own" on public.conversation_participants;
drop policy if exists "cp read own or peer" on public.conversation_participants;
create policy "cp read own or peer"
  on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );

drop policy if exists "cp insert self or peer" on public.conversation_participants;
create policy "cp insert self or peer"
  on public.conversation_participants for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "cp update own" on public.conversation_participants;
create policy "cp update own"
  on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "messages read participant" on public.messages;
create policy "messages read participant"
  on public.messages for select
  using (
    public.is_conversation_member(conversation_id)
    or public.is_admin()
  );

drop policy if exists "messages insert participant" on public.messages;
create policy "messages insert participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- ---------------------------------------------------------------------
-- REPORTS
-- ---------------------------------------------------------------------
drop policy if exists "reports insert authenticated" on public.reports;
create policy "reports insert authenticated"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "reports read own or admin" on public.reports;
create policy "reports read own or admin"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update"
  on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update"
  on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications admin insert" on public.notifications;
create policy "notifications admin insert"
  on public.notifications for insert
  with check (public.is_admin() or user_id = auth.uid());

-- ---------------------------------------------------------------------
-- AI RECOMMENDATIONS
-- ---------------------------------------------------------------------
drop policy if exists "ai recs own read" on public.ai_recommendations;
create policy "ai recs own read"
  on public.ai_recommendations for select
  using (user_id = auth.uid());

drop policy if exists "ai recs service write" on public.ai_recommendations;
create policy "ai recs service write"
  on public.ai_recommendations for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- STORAGE — listing images bucket
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('listing-images','listing-images', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars','avatars', true)
  on conflict (id) do nothing;

drop policy if exists "listing-images read" on storage.objects;
create policy "listing-images read"
  on storage.objects for select
  using (bucket_id in ('listing-images','avatars'));

drop policy if exists "listing-images upload" on storage.objects;
create policy "listing-images upload"
  on storage.objects for insert
  with check (
    bucket_id in ('listing-images','avatars')
    and auth.role() = 'authenticated'
  );

drop policy if exists "listing-images delete own" on storage.objects;
create policy "listing-images delete own"
  on storage.objects for delete
  using (
    bucket_id in ('listing-images','avatars')
    and owner = auth.uid()
  );

-- ---- functions.sql ----
-- =====================================================================
-- PetroConnect — RPCs, triggers, and views needed by the app code.
-- Run AFTER schema.sql and policies.sql.
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- RPC: increment_listing_views
-- Atomic counter bump. Used by the listing detail page so refreshing
-- doesn't race the read-modify-write update.
-- SECURITY DEFINER so members can bump views without needing UPDATE on
-- listings they don't own.
-- ---------------------------------------------------------------------
create or replace function public.increment_listing_views(p_listing uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new int;
begin
  if auth.uid() is null then
    return 0;
  end if;
  update public.listings
     set views = views + 1
   where id = p_listing
     and status = 'active'
     and seller_id <> auth.uid()
  returning views into v_new;
  return coalesce(v_new, 0);
end;
$$;

grant execute on function public.increment_listing_views(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: start_conversation
-- Atomically find-or-create a 1:1 conversation tied to a listing and
-- add both participants. Necessary because the conversations table's
-- SELECT policy requires you to be a participant — so the client can't
-- read back a row it just inserted unless we also insert the row in
-- conversation_participants in the same transaction.
-- ---------------------------------------------------------------------
create or replace function public.start_conversation(
  p_listing uuid,
  p_peer uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me uuid := auth.uid();
  v_existing uuid;
  v_new uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_peer is null or p_peer = v_me then raise exception 'invalid peer'; end if;

  select c.id into v_existing
  from public.conversations c
  join public.conversation_participants cp_me   on cp_me.conversation_id   = c.id and cp_me.user_id   = v_me
  join public.conversation_participants cp_peer on cp_peer.conversation_id = c.id and cp_peer.user_id = p_peer
  where (p_listing is null or c.listing_id = p_listing)
  limit 1;

  if v_existing is not null then return v_existing; end if;

  insert into public.conversations (listing_id) values (p_listing)
  returning id into v_new;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_new, v_me), (v_new, p_peer);

  return v_new;
end;
$$;

grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Trigger: notify recipients of a new message.
-- One row per *other* participant — the sender doesn't get a self-ping.
-- ---------------------------------------------------------------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_listing_title text;
begin
  select coalesce(full_name, email) into v_sender_name
    from public.profiles where id = new.sender_id;

  select l.title into v_listing_title
    from public.conversations c
    left join public.listings l on l.id = c.listing_id
   where c.id = new.conversation_id;

  insert into public.notifications (user_id, type, title, body, data)
  select
    cp.user_id,
    'message',
    coalesce(v_sender_name, 'New message'),
    left(new.body, 140),
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'sender_id',       new.sender_id,
      'listing_title',   v_listing_title
    )
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ---------------------------------------------------------------------
-- Trigger: notify seller when their listing is favorited.
-- ---------------------------------------------------------------------
create or replace function public.notify_on_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_title  text;
  v_favr   text;
begin
  select seller_id, title into v_seller, v_title
    from public.listings where id = new.listing_id;

  if v_seller is null or v_seller = new.user_id then
    return new;
  end if;

  select coalesce(full_name, email) into v_favr
    from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_seller,
    'favorite',
    'Someone saved your listing',
    coalesce(v_favr, 'A member') || ' saved "' || v_title || '"',
    jsonb_build_object('listing_id', new.listing_id, 'user_id', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists favorites_notify on public.favorites;
create trigger favorites_notify
  after insert on public.favorites
  for each row execute function public.notify_on_favorite();

-- ---------------------------------------------------------------------
-- VIEW: conversation_summaries
-- Pre-joins everything the chat list needs (peer, listing, unread count)
-- so the client makes one query instead of three.
-- ---------------------------------------------------------------------
create or replace view public.conversation_summaries as
with me as (select auth.uid() as id)
select
  c.id                       as conversation_id,
  c.last_message,
  c.last_message_at,
  c.created_at,
  me_cp.last_read_at,
  peer.id                    as peer_id,
  peer.full_name             as peer_full_name,
  peer.avatar_url            as peer_avatar_url,
  peer.company               as peer_company,
  peer.is_verified           as peer_is_verified,
  l.id                       as listing_id,
  l.title                    as listing_title,
  l.images                   as listing_images,
  l.price_kwd                as listing_price_kwd,
  (
    select count(*)::int from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> (select id from me)
      and (me_cp.last_read_at is null or m.created_at > me_cp.last_read_at)
  )                          as unread_count
from public.conversations c
join public.conversation_participants me_cp
  on me_cp.conversation_id = c.id
 and me_cp.user_id = (select id from me)
left join public.conversation_participants peer_cp
  on peer_cp.conversation_id = c.id
 and peer_cp.user_id <> (select id from me)
left join public.profiles peer
  on peer.id = peer_cp.user_id
left join public.listings l
  on l.id = c.listing_id;

grant select on public.conversation_summaries to authenticated;

-- The view runs as the *invoker*, so RLS on the underlying tables still
-- gates rows. No extra policy needed.

-- ---------------------------------------------------------------------
-- Helpful covering indexes (cheap, safe to add)
-- ---------------------------------------------------------------------
create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create index if not exists favorites_listing_idx
  on public.favorites(listing_id);

create index if not exists notifications_unread_idx
  on public.notifications(user_id, is_read, created_at desc)
  where is_read = false;

-- ---- ai.sql ----
-- =====================================================================
-- PetroConnect — AI extensions: pgvector, embedding column, RPCs
-- Run AFTER schema.sql, policies.sql, functions.sql.
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- pgvector extension + columns
-- ---------------------------------------------------------------------
create extension if not exists vector;

alter table public.listings
  add column if not exists embedding vector(1536),
  add column if not exists fingerprint text;

-- HNSW index for fast cosine similarity. Tunable build params; defaults
-- are fine for <100k rows.
create index if not exists listings_embedding_hnsw
  on public.listings using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists listings_fingerprint_idx
  on public.listings (fingerprint)
  where fingerprint is not null;

-- ---------------------------------------------------------------------
-- RPC: match_listings
-- Semantic search across active listings. Returns top-N with similarity.
-- ---------------------------------------------------------------------
create or replace function public.match_listings(
  query_embedding vector(1536),
  match_threshold float default 0.20,
  match_count int default 20,
  filter_kind text default null,
  filter_category uuid default null
)
returns table (
  id uuid,
  title text,
  description text,
  price_kwd numeric,
  images text[],
  kind public.listing_kind,
  similarity float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    l.id,
    l.title,
    l.description,
    l.price_kwd,
    l.images,
    l.kind,
    1 - (l.embedding <=> query_embedding) as similarity
  from public.listings l
  where l.status = 'active'
    and l.embedding is not null
    and (filter_kind is null or l.kind::text = filter_kind)
    and (filter_category is null or l.category_id = filter_category)
    and 1 - (l.embedding <=> query_embedding) > match_threshold
  order by l.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_listings(vector, float, int, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: find_similar_listings
-- Used by the create form to surface near-duplicates BEFORE publish.
-- ---------------------------------------------------------------------
create or replace function public.find_similar_listings(
  query_embedding vector(1536),
  exclude_id uuid default null,
  similarity_threshold float default 0.86,
  max_count int default 5
)
returns table (
  id uuid,
  title text,
  seller_id uuid,
  seller_full_name text,
  price_kwd numeric,
  similarity float,
  created_at timestamptz
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    l.id,
    l.title,
    l.seller_id,
    p.full_name,
    l.price_kwd,
    1 - (l.embedding <=> query_embedding) as similarity,
    l.created_at
  from public.listings l
  left join public.profiles p on p.id = l.seller_id
  where l.status = 'active'
    and l.embedding is not null
    and (exclude_id is null or l.id <> exclude_id)
    and 1 - (l.embedding <=> query_embedding) >= similarity_threshold
  order by l.embedding <=> query_embedding
  limit greatest(max_count, 1);
$$;

grant execute on function public.find_similar_listings(vector, uuid, float, int) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: suggest_price
-- Returns p25 / median / p75 of price among semantically-similar active
-- listings in the same category. Falls back to category-only if there
-- aren't enough semantic neighbours.
-- ---------------------------------------------------------------------
create or replace function public.suggest_price(
  query_embedding vector(1536),
  filter_category uuid default null,
  filter_kind text default 'product',
  min_neighbours int default 3,
  semantic_threshold float default 0.50
)
returns table (
  low numeric,
  median numeric,
  high numeric,
  sample_count int,
  source text
)
language plpgsql stable
security invoker
set search_path = public, pg_catalog
as $$
declare
  semantic_rows int;
begin
  -- Semantic neighbours first
  return query
  with neighbours as (
    select l.price_kwd
    from public.listings l
    where l.status = 'active'
      and l.price_kwd is not null
      and l.kind::text = filter_kind
      and l.embedding is not null
      and 1 - (l.embedding <=> query_embedding) >= semantic_threshold
    order by l.embedding <=> query_embedding
    limit 50
  )
  select
    percentile_cont(0.25) within group (order by price_kwd)::numeric(10,3),
    percentile_cont(0.50) within group (order by price_kwd)::numeric(10,3),
    percentile_cont(0.75) within group (order by price_kwd)::numeric(10,3),
    count(*)::int,
    'semantic'::text
  from neighbours
  having count(*) >= min_neighbours;

  get diagnostics semantic_rows = row_count;
  if semantic_rows > 0 then return; end if;

  -- Fallback: category-only median
  if filter_category is not null then
    return query
    select
      percentile_cont(0.25) within group (order by price_kwd)::numeric(10,3),
      percentile_cont(0.50) within group (order by price_kwd)::numeric(10,3),
      percentile_cont(0.75) within group (order by price_kwd)::numeric(10,3),
      count(*)::int,
      'category'::text
    from public.listings
    where status = 'active'
      and price_kwd is not null
      and kind::text = filter_kind
      and category_id = filter_category
    having count(*) >= min_neighbours;
  end if;
end;
$$;

grant execute on function public.suggest_price(vector, uuid, text, int, float) to authenticated;

-- ---- trust_system.sql ----
-- =====================================================================
-- PetroConnect — Trust System v2
--
-- Replaces the binary `is_verified` flag with a composite trust score
-- and 4 reputation tiers. The score is computed from data we already
-- collect; no new tables are needed.
--
-- TIERS:
--   newcomer (0 .. <30)   — fresh accounts, no trade history
--   trusted  (30 .. <60)  — handful of trades, decent rating
--   pro      (60 .. <85)  — many successful trades, high rating, fast replies
--   elite    (85 .. 100)  — top 5%; surfaces in leaderboards
--
-- SIGNALS (each clamped 0..1, then weighted):
--   - is_verified                       w=0.30   (domain-verified employee)
--   - rating_avg / 5                    w=0.25   (normalised stars)
--   - log1p(rating_count) / log(20)     w=0.20   (review volume, capped)
--   - log1p(listings_sold) / log(15)    w=0.15   (completed trades, capped)
--   - account_age_days / 180            w=0.10   (≥ 6 months = full credit)
--
-- The function is STABLE so callers can put it in views without overhead.
-- =====================================================================

create or replace function public.trust_score(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  with sigs as (
    select
      case when p.is_verified then 1.0 else 0.0 end                              as verified,
      coalesce(p.rating_avg, 0)::numeric / 5.0                                    as rating,
      least(1.0, ln(1 + coalesce(p.rating_count, 0)::numeric) / ln(20))           as volume,
      least(1.0,
        ln(1 + (
          select count(*)::numeric
          from public.listings l
          where l.seller_id = p_user
            and l.status = 'sold'
        )) / ln(15)
      )                                                                          as sold,
      least(1.0,
        greatest(0.0,
          extract(epoch from (now() - p.created_at)) / (86400 * 180)
        )
      )                                                                          as tenure
    from public.profiles p
    where p.id = p_user
  )
  select coalesce(
    round((
      verified * 30 +
      rating   * 25 +
      volume   * 20 +
      sold     * 15 +
      tenure   * 10
    )::numeric)::int,
    0
  )
  from sigs;
$$;

grant execute on function public.trust_score(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------
-- Tier helper — returns the tier label for a given score.
-- ---------------------------------------------------------------------
create or replace function public.trust_tier(p_score int)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when p_score is null     then 'newcomer'
    when p_score >= 85       then 'elite'
    when p_score >= 60       then 'pro'
    when p_score >= 30       then 'trusted'
    else                          'newcomer'
  end;
$$;

grant execute on function public.trust_tier(int) to authenticated, anon;

-- ---------------------------------------------------------------------
-- VIEW: profiles_with_trust
-- Extends profiles with score + tier. Use this in app queries instead
-- of profiles directly when you need trust UI.
-- ---------------------------------------------------------------------
create or replace view public.profiles_with_trust as
select
  p.*,
  public.trust_score(p.id) as trust_score,
  public.trust_tier(public.trust_score(p.id)) as trust_tier
from public.profiles p;

grant select on public.profiles_with_trust to authenticated, anon;

-- ---- trade_loop.sql ----
-- =====================================================================
-- PetroConnect — Trade completion loop
--
-- Adds:
--   • listings.reserved_for + listings.sold_to  (FK to profiles)
--   • reviews table (buyer↔seller, one per direction per transaction)
--   • RPCs: mark_listing_reserved, mark_listing_sold, leave_review
--   • Trigger that bumps profiles.rating_avg + rating_count on insert
--   • Constraint: a structured "offer" message stays a normal message row
--     — no schema change needed, just `data jsonb` for the offer payload.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New listing columns
-- ---------------------------------------------------------------------
alter table public.listings
  add column if not exists reserved_for uuid references public.profiles(id) on delete set null,
  add column if not exists sold_to      uuid references public.profiles(id) on delete set null,
  add column if not exists sold_at      timestamptz;

create index if not exists listings_sold_to_idx     on public.listings(sold_to)     where sold_to     is not null;
create index if not exists listings_reserved_idx    on public.listings(reserved_for) where reserved_for is not null;

-- ---------------------------------------------------------------------
-- 2. messages: add optional `kind` + `data` for structured offers
--    (we keep plain text in `body`, but offer cards live in `data`)
-- ---------------------------------------------------------------------
alter table public.messages
  add column if not exists kind text not null default 'text',
  add column if not exists data jsonb;

create index if not exists messages_kind_idx on public.messages(kind);

-- ---------------------------------------------------------------------
-- 3. reviews table
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  reviewer_id  uuid not null references public.profiles(id) on delete cascade,
  reviewee_id  uuid not null references public.profiles(id) on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  body         text,
  created_at   timestamptz not null default now(),
  unique (listing_id, reviewer_id) -- one review per direction per trade
);

create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id);

alter table public.reviews enable row level security;

drop policy if exists "reviews read all"           on public.reviews;
drop policy if exists "reviews insert participant" on public.reviews;

create policy "reviews read all"
  on public.reviews for select
  using (auth.role() = 'authenticated');

create policy "reviews insert participant"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = reviews.listing_id
        and l.status = 'sold'
        and (
          (l.seller_id = auth.uid() and l.sold_to     = reviews.reviewee_id) or
          (l.sold_to   = auth.uid() and l.seller_id   = reviews.reviewee_id)
        )
    )
  );

-- ---------------------------------------------------------------------
-- 4. Trigger: keep profiles.rating_avg + rating_count in sync
-- ---------------------------------------------------------------------
create or replace function public.refresh_review_rollup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.profiles p
     set rating_avg   = coalesce(stats.avg, 0),
         rating_count = coalesce(stats.cnt, 0)
    from (
      select avg(rating)::numeric(3,2) as avg, count(*)::int as cnt
      from public.reviews
      where reviewee_id = v_user
    ) stats
   where p.id = v_user;
  return new;
end;
$$;

drop trigger if exists reviews_rollup_ins on public.reviews;
create trigger reviews_rollup_ins
  after insert on public.reviews
  for each row execute function public.refresh_review_rollup();

drop trigger if exists reviews_rollup_del on public.reviews;
create trigger reviews_rollup_del
  after delete on public.reviews
  for each row execute function public.refresh_review_rollup();

-- ---------------------------------------------------------------------
-- 5. RPC: mark_listing_reserved(p_listing, p_buyer)
--    Only seller can call. Atomic.
-- ---------------------------------------------------------------------
create or replace function public.mark_listing_reserved(
  p_listing uuid,
  p_buyer uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  update public.listings
     set reserved_for = p_buyer,
         status = 'paused'
   where id = p_listing
     and seller_id = v_me;

  if not found then
    raise exception 'listing not found or not yours';
  end if;
end;
$$;

grant execute on function public.mark_listing_reserved(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. RPC: mark_listing_sold(p_listing, p_buyer)
--    Seller-only. Sets sold_to, status='sold', sold_at.
--    Also drops a notification into both participants so the review
--    prompt surfaces in the bell.
-- ---------------------------------------------------------------------
create or replace function public.mark_listing_sold(
  p_listing uuid,
  p_buyer uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me uuid := auth.uid();
  v_title text;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_buyer is null or p_buyer = v_me then raise exception 'invalid buyer'; end if;

  update public.listings
     set sold_to = p_buyer,
         status  = 'sold',
         sold_at = now(),
         reserved_for = null
   where id = p_listing
     and seller_id = v_me
  returning title into v_title;

  if not found then raise exception 'listing not found or not yours'; end if;

  -- Notify both sides — seller gets a self-ack, buyer gets a review prompt
  insert into public.notifications (user_id, type, title, body, data) values
    (v_me,    'sale_completed', 'Trade completed',  'Leave a review for the buyer.',  jsonb_build_object('listing_id', p_listing, 'peer_id', p_buyer)),
    (p_buyer, 'sale_completed', 'Trade completed',  'Leave a review for the seller.', jsonb_build_object('listing_id', p_listing, 'peer_id', v_me));
end;
$$;

grant execute on function public.mark_listing_sold(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. RPC: leave_review(p_listing, p_rating, p_body)
--    Validates the caller participated in the trade. Inserts via RLS
--    using auth.uid() automatically.
-- ---------------------------------------------------------------------
create or replace function public.leave_review(
  p_listing uuid,
  p_rating int,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me uuid := auth.uid();
  v_peer uuid;
  v_review_id uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be 1..5';
  end if;

  -- Determine the other party
  select case
    when l.seller_id = v_me then l.sold_to
    when l.sold_to   = v_me then l.seller_id
    else null
  end
  into v_peer
  from public.listings l
  where l.id = p_listing
    and l.status = 'sold';

  if v_peer is null then
    raise exception 'you were not part of this trade';
  end if;

  insert into public.reviews (listing_id, reviewer_id, reviewee_id, rating, body)
  values (p_listing, v_me, v_peer, p_rating, nullif(trim(p_body), ''))
  on conflict (listing_id, reviewer_id) do update
    set rating = excluded.rating,
        body   = excluded.body
  returning id into v_review_id;

  return v_review_id;
end;
$$;

grant execute on function public.leave_review(uuid, int, text) to authenticated;

-- ---- payments.sql ----
-- =====================================================================
-- PetroConnect — Payment workflow
--
-- Adds: payments, transactions, payment_events, platform_fees tables,
-- RLS, a compute_fee() helper and create/confirm RPCs. The trigger
-- compute_payment_totals keeps amount/fee/total consistent. The
-- on_payment_paid trigger flips the listing to sold and writes a
-- transactions row + notifications.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS (created safely)
-- ---------------------------------------------------------------------
do $$ begin
  create type public.payment_provider as enum (
    'mock','myfatoorah','tap','knet','apple_pay','card'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending','processing','paid','failed','refunded','cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- platform_fees (tiny config table — bracketed flat % rules)
-- ---------------------------------------------------------------------
create table if not exists public.platform_fees (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  min_amount      numeric(12,3) not null default 0,
  max_amount      numeric(12,3),
  percent         numeric(5,3)  not null default 0,
  flat_fee        numeric(10,3) not null default 0,
  active          boolean       not null default true,
  created_at      timestamptz   not null default now()
);

-- Seed a default rule once (2.5% with KWD 0 floor) if no rules exist yet.
insert into public.platform_fees (name, min_amount, max_amount, percent, flat_fee)
select 'Default 2.5%', 0, null, 2.5, 0
where not exists (select 1 from public.platform_fees where active = true);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  buyer_id            uuid not null references public.profiles(id) on delete restrict,
  seller_id           uuid not null references public.profiles(id) on delete restrict,
  amount              numeric(12,3) not null check (amount > 0),
  platform_fee        numeric(12,3) not null default 0 check (platform_fee >= 0),
  total               numeric(12,3) not null check (total > 0),
  currency            text not null default 'KWD',
  provider            public.payment_provider not null default 'mock',
  provider_payment_id text,
  status              public.payment_status not null default 'pending',
  metadata            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  paid_at             timestamptz,
  failed_at           timestamptz,
  refunded_at         timestamptz
);

create index if not exists payments_buyer_idx     on public.payments(buyer_id,  created_at desc);
create index if not exists payments_seller_idx    on public.payments(seller_id, created_at desc);
create index if not exists payments_listing_idx   on public.payments(listing_id);
create index if not exists payments_status_idx    on public.payments(status, created_at desc);

-- Only one *active* (pending|processing|paid) payment per listing.
create unique index if not exists payments_one_active_per_listing
  on public.payments(listing_id)
  where status in ('pending','processing','paid');

-- ---------------------------------------------------------------------
-- payment_events  (audit log)
-- ---------------------------------------------------------------------
create table if not exists public.payment_events (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references public.payments(id) on delete cascade,
  event_type  text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists payment_events_payment_idx
  on public.payment_events(payment_id, created_at desc);

-- ---------------------------------------------------------------------
-- transactions  (one row per successful trade)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null unique references public.payments(id) on delete cascade,
  listing_id    uuid not null references public.listings(id) on delete cascade,
  buyer_id      uuid not null references public.profiles(id) on delete restrict,
  seller_id     uuid not null references public.profiles(id) on delete restrict,
  amount        numeric(12,3) not null,
  platform_fee  numeric(12,3) not null default 0,
  total         numeric(12,3) not null,
  completed_at  timestamptz not null default now()
);

create index if not exists transactions_listing_idx  on public.transactions(listing_id);
create index if not exists transactions_buyer_idx    on public.transactions(buyer_id,  completed_at desc);
create index if not exists transactions_seller_idx   on public.transactions(seller_id, completed_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.platform_fees   enable row level security;
alter table public.payments        enable row level security;
alter table public.payment_events  enable row level security;
alter table public.transactions    enable row level security;

drop policy if exists "fees public read"        on public.platform_fees;
create policy "fees public read"
  on public.platform_fees for select using (true);

drop policy if exists "fees admin write"        on public.platform_fees;
create policy "fees admin write"
  on public.platform_fees for all
  using (public.is_admin()) with check (public.is_admin());

-- Payments: only the two participants (or admin) can read. The RPCs
-- handle all writes so we lock direct INSERT/UPDATE to admins only.
drop policy if exists "payments participants read" on public.payments;
create policy "payments participants read"
  on public.payments for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "payments admin write" on public.payments;
create policy "payments admin write"
  on public.payments for all
  using (public.is_admin()) with check (public.is_admin());

-- Events follow the parent payment
drop policy if exists "events participants read" on public.payment_events;
create policy "events participants read"
  on public.payment_events for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      where p.id = payment_events.payment_id
        and (p.buyer_id = auth.uid() or p.seller_id = auth.uid())
    )
  );

drop policy if exists "events admin write" on public.payment_events;
create policy "events admin write"
  on public.payment_events for all
  using (public.is_admin()) with check (public.is_admin());

-- Transactions
drop policy if exists "tx participants read" on public.transactions;
create policy "tx participants read"
  on public.transactions for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "tx admin write" on public.transactions;
create policy "tx admin write"
  on public.transactions for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- HELPER: compute_fee(amount) → numeric  (returns flat fee in KWD)
-- ---------------------------------------------------------------------
create or replace function public.compute_fee(p_amount numeric)
returns numeric
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select round((p_amount * percent / 100.0 + flat_fee)::numeric, 3)
      from public.platform_fees
      where active = true
        and p_amount >= min_amount
        and (max_amount is null or p_amount < max_amount)
      order by min_amount desc
      limit 1
    ),
    0
  );
$$;

grant execute on function public.compute_fee(numeric) to authenticated;

-- ---------------------------------------------------------------------
-- TRIGGER: keep `total` consistent on insert/update
-- ---------------------------------------------------------------------
create or replace function public.payment_compute_totals()
returns trigger
language plpgsql
as $$
begin
  if new.platform_fee is null then
    new.platform_fee := public.compute_fee(new.amount);
  end if;
  new.total      := new.amount + new.platform_fee;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payments_totals_bi on public.payments;
create trigger payments_totals_bi
  before insert or update on public.payments
  for each row execute function public.payment_compute_totals();

-- ---------------------------------------------------------------------
-- TRIGGER: when a payment flips to paid → close the trade
-- ---------------------------------------------------------------------
create or replace function public.on_payment_paid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_title text;
begin
  if (tg_op = 'INSERT' and new.status = 'paid')
     or (tg_op = 'UPDATE' and new.status = 'paid' and (old.status is null or old.status <> 'paid'))
  then
    -- Stamp the listing
    update public.listings
       set status        = 'sold'::public.listing_status,
           sold_to       = new.buyer_id,
           sold_at       = coalesce(new.paid_at, now()),
           reserved_for  = null
     where id = new.listing_id
    returning title into v_title;

    -- Reify the trade
    insert into public.transactions (
      payment_id, listing_id, buyer_id, seller_id,
      amount, platform_fee, total, completed_at
    )
    values (
      new.id, new.listing_id, new.buyer_id, new.seller_id,
      new.amount, new.platform_fee, new.total, coalesce(new.paid_at, now())
    )
    on conflict (payment_id) do nothing;

    -- Audit
    insert into public.payment_events (payment_id, event_type, payload)
    values (new.id, 'paid',
            jsonb_build_object('listing_id', new.listing_id, 'total', new.total));

    -- Notify both parties
    insert into public.notifications (user_id, type, title, body, data) values
      (new.seller_id, 'payment_received',
       'Payment received',
       coalesce(v_title, 'Your listing') || ' — KWD ' || new.total,
       jsonb_build_object('payment_id', new.id, 'listing_id', new.listing_id)),
      (new.buyer_id, 'payment_completed',
       'Payment completed',
       'You paid KWD ' || new.total || ' for ' || coalesce(v_title, 'a listing'),
       jsonb_build_object('payment_id', new.id, 'listing_id', new.listing_id));
  end if;

  return new;
end;
$$;

drop trigger if exists payments_paid_ai on public.payments;
create trigger payments_paid_ai
  after insert or update of status on public.payments
  for each row execute function public.on_payment_paid();

-- ---------------------------------------------------------------------
-- RPC: create_payment(listing) → payments.id
-- Buyer must be the listing's reserved_for. Idempotent: returns the
-- existing pending/processing payment if one already exists.
-- ---------------------------------------------------------------------
create or replace function public.create_payment(
  p_listing uuid,
  p_provider public.payment_provider default 'mock'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me        uuid := auth.uid();
  v_listing   public.listings;
  v_amount    numeric;
  v_fee       numeric;
  v_existing  uuid;
  v_id        uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  select * into v_listing from public.listings where id = p_listing;
  if not found then raise exception 'listing not found'; end if;

  if v_listing.seller_id = v_me then
    raise exception 'cannot pay your own listing';
  end if;
  if v_listing.reserved_for is null or v_listing.reserved_for <> v_me then
    raise exception 'listing not reserved for you';
  end if;
  if v_listing.price_kwd is null or v_listing.price_kwd <= 0 then
    raise exception 'listing has no price';
  end if;

  v_amount := v_listing.price_kwd;
  v_fee    := public.compute_fee(v_amount);

  -- Re-use an existing active payment if we have one
  select id into v_existing
  from public.payments
  where listing_id = p_listing
    and status in ('pending','processing')
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.payments (
    listing_id, buyer_id, seller_id,
    amount, platform_fee, total, currency, provider, status
  )
  values (
    p_listing, v_me, v_listing.seller_id,
    v_amount, v_fee, v_amount + v_fee, 'KWD', p_provider, 'pending'
  )
  returning id into v_id;

  insert into public.payment_events (payment_id, event_type, payload)
  values (v_id, 'created',
          jsonb_build_object('provider', p_provider, 'amount', v_amount, 'fee', v_fee));

  return v_id;
end;
$$;

grant execute on function public.create_payment(uuid, public.payment_provider) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: confirm_payment(payment, provider_payment_id, success)
-- Used by the mock provider client-side and by the webhook server-side.
-- ---------------------------------------------------------------------
create or replace function public.confirm_payment(
  p_payment uuid,
  p_provider_payment_id text,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me uuid := auth.uid();
  v_row public.payments;
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  select * into v_row from public.payments where id = p_payment;
  if not found then raise exception 'payment not found'; end if;

  -- Only the buyer or an admin may confirm in this RPC. Webhook routes
  -- bypass this via the service-role key.
  if v_row.buyer_id <> v_me and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if v_row.status in ('paid','refunded','cancelled') then
    raise exception 'payment already terminal: %', v_row.status;
  end if;

  if p_success then
    update public.payments
       set status              = 'paid',
           provider_payment_id = p_provider_payment_id,
           paid_at             = now()
     where id = p_payment;

    insert into public.payment_events (payment_id, event_type, payload)
    values (p_payment, 'confirmed_success',
            jsonb_build_object('provider_payment_id', p_provider_payment_id));
  else
    update public.payments
       set status              = 'failed',
           provider_payment_id = p_provider_payment_id,
           failed_at           = now()
     where id = p_payment;

    insert into public.payment_events (payment_id, event_type, payload)
    values (p_payment, 'confirmed_failure',
            jsonb_build_object('provider_payment_id', p_provider_payment_id));
  end if;
end;
$$;

grant execute on function public.confirm_payment(uuid, text, boolean) to authenticated;

-- ---- seed.sql ----
-- =====================================================================
-- PetroConnect — Seed categories
-- =====================================================================

insert into public.categories (slug, name, kind, icon, sort_order) values
  ('electronics','Electronics','product','laptop',1),
  ('vehicles','Vehicles & Parts','product','car',2),
  ('furniture','Furniture','product','sofa',3),
  ('home-appliances','Home Appliances','product','refrigerator',4),
  ('fashion','Fashion','product','shirt',5),
  ('books','Books & Stationery','product','book',6),
  ('industrial','Industrial / Safety Gear','product','hard-hat',7),
  ('tools','Tools & Equipment','product','wrench',8),
  ('sports','Sports & Outdoors','product','dumbbell',9),
  ('other-product','Other','product','package',99),

  ('tutoring','Tutoring & Training','service','graduation-cap',1),
  ('technical','Technical / Engineering','service','cog',2),
  ('translation','Translation','service','languages',3),
  ('photography','Photography','service','camera',4),
  ('home-services','Home Services','service','home',5),
  ('logistics','Logistics & Moving','service','truck',6),
  ('it-services','IT / Software','service','code',7),
  ('consulting','Consulting','service','briefcase',8),
  ('other-service','Other','service','sparkles',99)
on conflict (slug) do nothing;

