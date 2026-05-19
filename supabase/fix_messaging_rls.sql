-- =====================================================================
-- PetroConnect — fix: recursive RLS policies on conversation_participants
-- and messages were causing reads to silently return zero rows.
--
-- The original policies referenced their own table inside an exists()
-- clause. Postgres detects the recursion and returns no rows. The fix
-- is to push the membership check into a SECURITY DEFINER helper, so
-- the recursive read happens outside of RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: is the calling user a participant in this conversation?
-- ---------------------------------------------------------------------
create or replace function public.is_conversation_member(p_conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists(
    select 1 from public.conversation_participants
    where conversation_id = p_conv
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Conversation participants
-- ---------------------------------------------------------------------
drop policy if exists "cp read own"          on public.conversation_participants;
drop policy if exists "cp read own or peer"  on public.conversation_participants;

create policy "cp read own or peer"
  on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );

-- ---------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------
drop policy if exists "conversations read participant" on public.conversations;

create policy "conversations read participant"
  on public.conversations for select
  using (
    public.is_conversation_member(id)
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------
drop policy if exists "messages read participant" on public.messages;
drop policy if exists "messages insert participant" on public.messages;

create policy "messages read participant"
  on public.messages for select
  using (
    public.is_conversation_member(conversation_id)
    or public.is_admin()
  );

create policy "messages insert participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );
