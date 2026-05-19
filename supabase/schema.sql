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
