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
