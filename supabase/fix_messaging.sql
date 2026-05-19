-- =====================================================================
-- PetroConnect — fix: messaging flow blocked by RLS race condition.
-- Replaces the earlier buggy version (referenced v_peer, but the param
-- is p_peer).
-- =====================================================================

drop function if exists public.start_conversation(uuid, uuid);

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
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_peer is null or p_peer = v_me then
    raise exception 'invalid peer';
  end if;

  -- Reuse an existing 1:1 conversation on this listing if there is one
  select c.id into v_existing
  from public.conversations c
  join public.conversation_participants cp_me   on cp_me.conversation_id   = c.id and cp_me.user_id   = v_me
  join public.conversation_participants cp_peer on cp_peer.conversation_id = c.id and cp_peer.user_id = p_peer
  where (p_listing is null or c.listing_id = p_listing)
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.conversations (listing_id) values (p_listing)
  returning id into v_new;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_new, v_me), (v_new, p_peer);

  return v_new;
end;
$$;

grant execute on function public.start_conversation(uuid, uuid) to authenticated;
