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
