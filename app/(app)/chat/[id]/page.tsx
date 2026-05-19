import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import {
  DEMO_CONVERSATIONS,
  demoMessagesFor,
  isDemoMode,
} from "@/lib/demo/data";
import { ChatRoom } from "@/components/chat/chat-room";
import type { Message, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireProfile();

  if (isDemoMode()) {
    const conv = DEMO_CONVERSATIONS.find((c) => c.id === id);
    if (!conv) notFound();
    const messages = demoMessagesFor(id);
    return (
      <div className="grid lg:grid-cols-[360px_1fr] gap-6 h-[calc(100dvh-9rem)] animate-fade-in">
        <Link
          href="/chat"
          className="lg:hidden inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1" /> All conversations
        </Link>
        <aside className="hidden lg:block">
          <h1 className="text-2xl font-semibold tracking-tight mb-3">Messages</h1>
          <p className="text-xs text-muted-foreground mb-3">Active conversation</p>
          <div className="rounded-2xl glass p-4 space-y-2">
            <p className="font-medium">{conv.peer.full_name}</p>
            <Link
              href={`/listings/${conv.listing.id}`}
              className="text-xs text-primary hover:underline"
            >
              View listing: {conv.listing.title}
            </Link>
          </div>
        </aside>
        <ChatRoom
          conversationId={id}
          meId={me.id}
          peer={conv.peer}
          initialMessages={messages}
          listing={conv.listing}
        />
      </div>
    );
  }

  const supabase = await createClient();

  type ListingPreview = {
    id: string;
    title: string;
    images: string[];
    price_kwd: number | null;
    seller_id: string | null;
  };

  // Three independent reads — fan out in parallel
  const [convRes, peersRes, msgsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, listing:listings(id, title, images, price_kwd, seller_id)")
      .eq("id", id)
      .single(),
    supabase
      .from("conversation_participants")
      .select("profiles:profiles!user_id(*)")
      .eq("conversation_id", id)
      .neq("user_id", me.id),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  const listing =
    (convRes.data as unknown as { listing: ListingPreview | null } | null)?.listing ??
    null;

  const peer =
    (peersRes.data?.[0] as unknown as { profiles: Profile } | undefined)?.profiles ?? null;

  // Mark as read — fire and forget, don't block render
  void supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", me.id);

  const msgs = msgsRes.data;

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6 h-[calc(100dvh-9rem)] animate-fade-in">
      <Link
        href="/chat"
        className="lg:hidden inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 mr-1" /> All conversations
      </Link>

      <aside className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight mb-3">Messages</h1>
        <p className="text-xs text-muted-foreground mb-3">Active conversation</p>
        <div className="rounded-2xl glass p-4 space-y-2">
          <p className="font-medium">{peer?.full_name ?? "Member"}</p>
          {listing && (
            <Link
              href={`/listings/${listing.id}`}
              className="text-xs text-primary hover:underline"
            >
              View listing: {listing.title}
            </Link>
          )}
        </div>
      </aside>

      <ChatRoom
        conversationId={id}
        meId={me.id}
        peer={peer}
        initialMessages={(msgs ?? []) as Message[]}
        listing={listing}
      />
    </div>
  );
}
