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
