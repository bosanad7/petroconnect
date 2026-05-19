import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import { DEMO_CONVERSATIONS, isDemoMode } from "@/lib/demo/data";
import { ConversationList, type ConversationListItem } from "@/components/chat/conversation-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SummaryRow {
  conversation_id: string;
  last_message: string | null;
  last_message_at: string | null;
  last_read_at: string | null;
  peer_id: string | null;
  peer_full_name: string | null;
  peer_avatar_url: string | null;
  listing_id: string | null;
  listing_title: string | null;
  listing_images: string[] | null;
  unread_count: number | null;
}

export default async function ChatIndexPage() {
  const me = await requireProfile();

  if (isDemoMode()) {
    const conversations: ConversationListItem[] = DEMO_CONVERSATIONS.map((c) => ({
      id: c.id,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      lastReadAt: c.lastReadAt,
      unreadCount: c.lastReadAt && c.last_message_at && c.last_message_at > c.lastReadAt ? 1 : 0,
      listing: { id: c.listing.id, title: c.listing.title, images: c.listing.images },
      peer: { id: c.peer.id, full_name: c.peer.full_name, avatar_url: c.peer.avatar_url },
    }));
    return renderChat({ conversations });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_summaries")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  const conversations: ConversationListItem[] = ((data ?? []) as SummaryRow[]).map(
    (r) => ({
      id: r.conversation_id,
      lastMessage: r.last_message,
      lastMessageAt: r.last_message_at,
      lastReadAt: r.last_read_at,
      unreadCount: r.unread_count ?? 0,
      peer: r.peer_id
        ? {
            id: r.peer_id,
            full_name: r.peer_full_name,
            avatar_url: r.peer_avatar_url,
          }
        : undefined,
      listing: r.listing_id
        ? {
            id: r.listing_id,
            title: r.listing_title ?? "",
            images: r.listing_images ?? [],
          }
        : null,
    }),
  );

  // Sanity check: silence the unused warning if `me` ever becomes optional.
  void me;

  return renderChat({ conversations });
}

function renderChat({ conversations }: { conversations: ConversationListItem[] }) {
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
