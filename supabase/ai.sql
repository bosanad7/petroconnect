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
