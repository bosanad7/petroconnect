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
