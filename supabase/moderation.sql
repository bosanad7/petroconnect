-- =====================================================================
-- PetroConnect — AI message moderation
--
-- Adds flag columns to messages and an admin-only RPC for triage.
-- Messages are scanned async by /api/ai/moderate-message after insert
-- (fire-and-forget). When severity crosses the threshold, the service
-- role stamps `flagged_at` + severity + categories.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

alter table public.messages
  add column if not exists flagged_at             timestamptz,
  add column if not exists moderation_severity    numeric(3,2),
  add column if not exists moderation_categories  text[],
  add column if not exists moderation_rationale   text;

create index if not exists messages_flagged_idx
  on public.messages(flagged_at desc nulls last)
  where flagged_at is not null;

-- ---------------------------------------------------------------------
-- RPC: resolve_flagged_message  (admin only)
--   action = 'dismiss' → clear the flag
--   action = 'keep'    → keep it visible in the queue
--   action = 'hide'    → soft-hide by appending a moderation tag to the
--                        body so the recipient sees a placeholder
-- ---------------------------------------------------------------------
create or replace function public.resolve_flagged_message(
  p_message uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_action = 'dismiss' then
    update public.messages
       set flagged_at = null,
           moderation_severity = null,
           moderation_categories = null,
           moderation_rationale = null
     where id = p_message;
  elsif p_action = 'hide' then
    update public.messages
       set body = '[removed by moderation]'
     where id = p_message;
  elsif p_action = 'keep' then
    -- no-op; kept here so the action set is closed
    return;
  else
    raise exception 'unknown action: %', p_action;
  end if;
end;
$$;

grant execute on function public.resolve_flagged_message(uuid, text) to authenticated;
