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
