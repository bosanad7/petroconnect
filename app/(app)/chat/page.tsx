import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import { ConversationList } from "@/components/chat/conversation-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ChatIndexPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("conversation_participants")
    .select(
      `conversation_id,
       last_read_at,
       conversations!inner (
         id, last_message, last_message_at, created_at,
         listing:listings(id, title, images)
       )`,
    )
    .eq("user_id", me.id);

  const ids = (rows ?? []).map((r) => r.conversation_id);

  // Fetch peers for each conversation
  const peerMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
  if (ids.length) {
    const { data: peers } = await supabase
      .from("conversation_participants")
      .select("conversation_id, profiles:profiles!user_id(id, full_name, avatar_url)")
      .in("conversation_id", ids)
      .neq("user_id", me.id);
    for (const row of peers ?? []) {
      const p = (row as unknown as { profiles: { id: string; full_name: string | null; avatar_url: string | null } }).profiles;
      if (p) peerMap[(row as { conversation_id: string }).conversation_id] = p;
    }
  }

  const conversations = (rows ?? [])
    // @ts-expect-error nested
    .map((r) => ({
      id: r.conversation_id,
      lastReadAt: r.last_read_at,
      // @ts-expect-error nested
      lastMessage: r.conversations?.last_message ?? null,
      // @ts-expect-error nested
      lastMessageAt: r.conversations?.last_message_at ?? null,
      // @ts-expect-error nested
      listing: r.conversations?.listing ?? null,
      peer: peerMap[r.conversation_id],
    }))
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt ?? 0).getTime() -
        new Date(a.lastMessageAt ?? 0).getTime(),
    );

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6 animate-fade-in">
      <aside className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <ConversationList conversations={conversations} />
      </aside>
      <div className="hidden lg:block">
        <EmptyState
          icon={<MessageSquare className="size-6" />}
          title="Choose a conversation"
          description="Or start a new one from any listing's page."
          action={
            <Button asChild variant="outline">
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
