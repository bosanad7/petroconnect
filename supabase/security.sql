-- =====================================================================
-- PetroConnect — Security hardening pass
--
-- Adds:
--   • listing_moderation_status enum + moderation columns
--   • admin_audit_log table (RLS-locked to admins)
--   • BEFORE UPDATE triggers on listings + profiles that restore
--     admin-only columns from OLD when the caller isn't an admin —
--     equivalent to column-level RLS, works against direct REST writes.
--   • create_listing RPC: server-validated, auto-flags suspicious posts
--   • moderate_listing RPC: admin-only approve / reject / feature
--   • Tightened confirm_payment so non-mock providers can't self-confirm
--   • Banned-words guard
--
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Teach is_admin() to recognise the service-role JWT so server-side
--    privileged code paths (webhooks, /api/listings/scan, etc.) can
--    write admin-only fields without tripping the lock triggers below.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select
    coalesce(
      (current_setting('request.jwt.claim.role', true) = 'service_role'),
      false
    )
    or coalesce(
      (select role = 'admin' from public.profiles where id = auth.uid()),
      false
    );
$$;

-- A second escape hatch: SECURITY DEFINER RPCs that legitimately need
-- to write to locked fields (mark_listing_sold, increment_listing_views,
-- on_payment_paid) can flip a transaction-scoped GUC and the lock
-- triggers will let them through.
create or replace function public.bypass_listing_lock()
returns void
language sql volatile
as $$ select set_config('app.bypass_listing_lock', 'true', true); $$;

create or replace function public.bypass_profile_lock()
returns void
language sql volatile
as $$ select set_config('app.bypass_profile_lock', 'true', true); $$;

-- ---------------------------------------------------------------------
-- 1. Moderation status enum + columns
-- ---------------------------------------------------------------------
do $$ begin
  create type public.listing_moderation_status as enum (
    'approved','pending_review','rejected'
  );
exception when duplicate_object then null; end $$;

alter table public.listings
  add column if not exists moderation_status public.listing_moderation_status
    not null default 'approved',
  add column if not exists moderation_reason text,
  add column if not exists flagged_reasons text[] not null default '{}';

create index if not exists listings_moderation_idx
  on public.listings(moderation_status)
  where moderation_status <> 'approved';

-- ---------------------------------------------------------------------
-- 2. admin_audit_log
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id) on delete restrict,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  reason      text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_admin_idx  on public.admin_audit_log(admin_id, created_at desc);
create index if not exists audit_log_target_idx on public.admin_audit_log(target_type, target_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read"
  on public.admin_audit_log for select
  using (public.is_admin());

drop policy if exists "audit admin write" on public.admin_audit_log;
create policy "audit admin write"
  on public.admin_audit_log for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. lock_listing_admin_fields — non-admins can't change sensitive cols
-- ---------------------------------------------------------------------
-- Triggers run *under* RLS so this catches direct REST PATCH requests
-- that the seller policy would otherwise allow. Calls from admins or
-- from SECURITY DEFINER RPCs (which run as postgres) skip the lock.
create or replace function public.lock_listing_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_bypass   boolean := coalesce(current_setting('app.bypass_listing_lock', true), '') = 'true';
begin
  if v_is_admin or v_bypass then return new; end if;

  -- Identity columns — never editable by the seller
  new.id            := old.id;
  new.seller_id     := old.seller_id;
  new.created_at    := old.created_at;

  -- Admin / system-controlled fields
  new.ai_score          := old.ai_score;
  new.ai_flags          := old.ai_flags;
  new.is_featured       := old.is_featured;
  new.views             := old.views;
  new.moderation_status := old.moderation_status;
  new.moderation_reason := old.moderation_reason;
  new.flagged_reasons   := old.flagged_reasons;

  -- Trade-loop fields — only the RPCs (mark_listing_reserved /
  -- mark_listing_sold / on_payment_paid) may flip these
  new.reserved_for := old.reserved_for;
  new.sold_to      := old.sold_to;
  new.sold_at      := old.sold_at;

  -- AI embedding + fingerprint are computed by the embed-listing route
  new.embedding   := old.embedding;
  new.fingerprint := old.fingerprint;

  return new;
end;
$$;

drop trigger if exists listings_lock_admin_fields on public.listings;
create trigger listings_lock_admin_fields
  before update on public.listings
  for each row execute function public.lock_listing_admin_fields();

-- ---------------------------------------------------------------------
-- 4. lock_profile_admin_fields — block role/is_verified self-elevation
-- ---------------------------------------------------------------------
create or replace function public.lock_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_bypass   boolean := coalesce(current_setting('app.bypass_profile_lock', true), '') = 'true';
begin
  if v_is_admin or v_bypass then return new; end if;

  -- Identity
  new.id          := old.id;
  new.email       := old.email;
  new.created_at  := old.created_at;

  -- Role + verification: only the handle_new_user trigger or an admin
  -- may set these.
  new.role        := old.role;
  new.is_verified := old.is_verified;
  new.company     := old.company;

  -- Reputation: computed from reviews trigger only
  new.rating_avg   := old.rating_avg;
  new.rating_count := old.rating_count;

  return new;
end;
$$;

drop trigger if exists profiles_lock_admin_fields on public.profiles;
create trigger profiles_lock_admin_fields
  before update on public.profiles
  for each row execute function public.lock_profile_admin_fields();

-- ---------------------------------------------------------------------
-- 5. is_banned_pattern — banned-words / scam-pattern check
-- ---------------------------------------------------------------------
create or replace function public.is_banned_pattern(p_text text)
returns boolean
language sql immutable
set search_path = public, pg_catalog
as $$
  select coalesce(
    lower(p_text) ~ ('('
      || 'western[- ]?union|moneygram|btc only|crypto only|usdt|'
      || 'send.{0,5}otp|whatsapp.{0,5}only|telegram.{0,5}only|'
      || 'off[- ]?platform|escrow off|cash app only|paypal friends|'
      || 'iban.{0,40}share|share.{0,5}iban|bank.{0,5}details|'
      || 'pay.{0,5}upfront.{0,20}delivery'
      || ')'),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- 6. create_listing RPC — validated, auto-flagging
-- ---------------------------------------------------------------------
create or replace function public.create_listing(
  p_kind          public.listing_kind,
  p_title         text,
  p_description   text,
  p_category_id   uuid,
  p_condition     public.listing_condition,
  p_price_kwd     numeric,
  p_is_negotiable boolean,
  p_location      text,
  p_images        text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me           uuid := auth.uid();
  v_verified     boolean;
  v_recent_count int;
  v_dup_count    int;
  v_fp           text;
  v_flags        text[] := '{}';
  v_status       public.listing_moderation_status := 'approved';
  v_id           uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  -- Must be a verified employee
  select is_verified into v_verified from public.profiles where id = v_me;
  if v_verified is not true then
    raise exception 'only verified employees can post';
  end if;

  -- ---- Hard-validation ------------------------------------------------
  if p_title is null or length(trim(p_title)) < 8 or length(p_title) > 120 then
    raise exception 'title must be 8..120 characters';
  end if;
  if p_description is null or length(trim(p_description)) < 30 or length(p_description) > 4000 then
    raise exception 'description must be 30..4000 characters';
  end if;
  if p_kind not in ('product','service','service_request') then
    raise exception 'invalid kind';
  end if;
  if p_price_kwd is not null and (p_price_kwd < 0 or p_price_kwd > 100000) then
    raise exception 'price must be between 0 and 100000 KWD';
  end if;
  if coalesce(array_length(p_images, 1), 0) > 8 then
    raise exception 'max 8 images allowed';
  end if;
  if p_category_id is not null
     and not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'invalid category';
  end if;

  -- ---- Rate limit (10 listings / 24h) --------------------------------
  select count(*) into v_recent_count
  from public.listings
  where seller_id = v_me
    and created_at > now() - interval '24 hours';
  if v_recent_count >= 10 then
    raise exception 'rate limit: max 10 listings in 24 hours';
  end if;

  -- ---- Auto-flag heuristics ------------------------------------------
  if v_recent_count >= 5 then
    v_flags := array_append(v_flags, 'rapid_posting');
  end if;

  if p_price_kwd is not null then
    if p_price_kwd >= 25000 then
      v_flags := array_append(v_flags, 'very_high_price');
    end if;
    if p_kind = 'product' and p_price_kwd > 0 and p_price_kwd < 1 then
      v_flags := array_append(v_flags, 'very_low_price');
    end if;
  end if;

  if public.is_banned_pattern(p_title || ' ' || p_description) then
    v_flags := array_append(v_flags, 'banned_pattern');
  end if;

  -- Duplicate fingerprint check (case-insensitive normalized token bag)
  v_fp := array_to_string(
    (
      select array_agg(distinct w order by w)
      from regexp_split_to_table(
        lower(regexp_replace(p_title || ' ' || p_description, '[^[:alnum:][:space:]]', ' ', 'g')),
        '\s+'
      ) w
      where length(w) > 2
      limit 24
    ),
    ' '
  );

  if v_fp is not null and v_fp <> '' then
    select count(*) into v_dup_count
    from public.listings
    where fingerprint = v_fp
      and seller_id = v_me
      and status = 'active';
    if v_dup_count > 0 then
      v_flags := array_append(v_flags, 'duplicate_of_own_listing');
    end if;
  end if;

  if array_length(v_flags, 1) > 0 then
    v_status := 'pending_review';
  end if;

  -- ---- Insert ---------------------------------------------------------
  insert into public.listings (
    seller_id, kind, title, description, category_id, condition,
    price_kwd, is_negotiable, location, images,
    status, moderation_status, flagged_reasons, fingerprint
  )
  values (
    v_me, p_kind, trim(p_title), trim(p_description), p_category_id, p_condition,
    p_price_kwd, p_is_negotiable, p_location, p_images,
    'active'::public.listing_status, v_status, v_flags, v_fp
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_listing(
  public.listing_kind, text, text, uuid, public.listing_condition,
  numeric, boolean, text, text[]
) to authenticated;

-- ---------------------------------------------------------------------
-- 7. moderate_listing RPC — admin only (approve / reject / feature)
-- ---------------------------------------------------------------------
create or replace function public.moderate_listing(
  p_listing uuid,
  p_action  text,            -- 'approve' | 'reject' | 'feature' | 'unfeature' | 'remove'
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_me uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  case p_action
    when 'approve' then
      update public.listings
         set moderation_status = 'approved',
             moderation_reason = p_reason,
             status            = case when status = 'removed' then 'active'::public.listing_status else status end
       where id = p_listing;
    when 'reject' then
      update public.listings
         set moderation_status = 'rejected',
             moderation_reason = p_reason,
             status            = 'removed'::public.listing_status
       where id = p_listing;
    when 'remove' then
      update public.listings
         set status            = 'removed'::public.listing_status,
             moderation_reason = p_reason
       where id = p_listing;
    when 'feature' then
      update public.listings
         set is_featured       = true,
             moderation_status = 'approved'
       where id = p_listing;
    when 'unfeature' then
      update public.listings
         set is_featured = false
       where id = p_listing;
    else
      raise exception 'unknown action: %', p_action;
  end case;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason, payload)
  values (v_me, p_action, 'listing', p_listing, p_reason, jsonb_build_object('action', p_action));
end;
$$;

grant execute on function public.moderate_listing(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Tighten confirm_payment — non-mock providers must go via webhook
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

  -- Only the buyer or an admin may confirm here. Webhooks use the
  -- service-role client and skip this RPC entirely.
  if v_row.buyer_id <> v_me and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  -- Real-gateway payments must NOT be self-confirmable. Only mock-mode
  -- demos go through this path; real flows are flipped by the webhook.
  if v_row.provider <> 'mock' and not public.is_admin() then
    raise exception 'this provider must be confirmed via webhook';
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

-- ---------------------------------------------------------------------
-- 9. Belt-and-suspenders — direct listing INSERT must also satisfy
--    the same minimums even if a client bypasses the RPC.
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.listings
    add constraint listings_title_len_chk
      check (length(title) between 1 and 200) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.listings
    add constraint listings_price_chk
      check (price_kwd is null or (price_kwd >= 0 and price_kwd <= 1000000)) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.listings
    add constraint listings_images_max_chk
      check (coalesce(array_length(images, 1), 0) <= 12) not valid;
exception when duplicate_object then null; end $$;

-- Validate against existing rows but tolerate any pre-existing oddities
alter table public.listings validate constraint listings_title_len_chk;
alter table public.listings validate constraint listings_images_max_chk;
-- price check intentionally not validated against history (older seed
-- data may have edge values); the check still gates new inserts.

-- ---------------------------------------------------------------------
-- 10. Wire the bypass flag into the SECURITY DEFINER RPCs that
--     legitimately mutate locked columns. (Re-create the function
--     bodies — small, idempotent.)
-- ---------------------------------------------------------------------

-- Views counter
create or replace function public.increment_listing_views(p_listing uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_new int;
begin
  if auth.uid() is null then return 0; end if;
  perform public.bypass_listing_lock();
  update public.listings
     set views = views + 1
   where id = p_listing
     and status = 'active'
     and seller_id <> auth.uid()
  returning views into v_new;
  return coalesce(v_new, 0);
end;
$$;

-- Reserve (sets reserved_for + flips status to paused)
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
  perform public.bypass_listing_lock();
  update public.listings
     set reserved_for = p_buyer,
         status = 'paused'
   where id = p_listing
     and seller_id = v_me;
  if not found then raise exception 'listing not found or not yours'; end if;
end;
$$;

-- Sold (sets sold_to/sold_at + status)
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

  perform public.bypass_listing_lock();
  update public.listings
     set sold_to = p_buyer,
         status  = 'sold',
         sold_at = now(),
         reserved_for = null
   where id = p_listing
     and seller_id = v_me
  returning title into v_title;
  if not found then raise exception 'listing not found or not yours'; end if;

  insert into public.notifications (user_id, type, title, body, data) values
    (v_me,    'sale_completed', 'Trade completed',  'Leave a review for the buyer.',  jsonb_build_object('listing_id', p_listing, 'peer_id', p_buyer)),
    (p_buyer, 'sale_completed', 'Trade completed',  'Leave a review for the seller.', jsonb_build_object('listing_id', p_listing, 'peer_id', v_me));
end;
$$;

-- on_payment_paid trigger needs to update the listing too
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
    perform public.bypass_listing_lock();
    update public.listings
       set status        = 'sold'::public.listing_status,
           sold_to       = new.buyer_id,
           sold_at       = coalesce(new.paid_at, now()),
           reserved_for  = null
     where id = new.listing_id
    returning title into v_title;

    insert into public.transactions (
      payment_id, listing_id, buyer_id, seller_id,
      amount, platform_fee, total, completed_at
    )
    values (
      new.id, new.listing_id, new.buyer_id, new.seller_id,
      new.amount, new.platform_fee, new.total, coalesce(new.paid_at, now())
    )
    on conflict (payment_id) do nothing;

    insert into public.payment_events (payment_id, event_type, payload)
    values (new.id, 'paid',
            jsonb_build_object('listing_id', new.listing_id, 'total', new.total));

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

-- The reviews trigger updates profiles.rating_avg / rating_count and
-- must bypass the profile lock.
create or replace function public.refresh_review_rollup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  perform public.bypass_profile_lock();
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
