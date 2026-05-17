import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
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
  const supabase = await createClient();

  // Verify membership
  const { data: membership } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", id)
    .eq("user_id", me.id)
    .maybeSingle();
  if (!membership) notFound();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, listing:listings(id, title, images, price_kwd)")
    .eq("id", id)
    .single();

  const { data: peers } = await supabase
    .from("conversation_participants")
    .select("profiles:profiles!user_id(*)")
    .eq("conversation_id", id)
    .neq("user_id", me.id);

  const peer =
    (peers?.[0] as unknown as { profiles: Profile } | undefined)?.profiles ?? null;

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  // Mark as read
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", me.id);

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
          {/* @ts-expect-error nested */}
          {conv?.listing && (
            <Link
              // @ts-expect-error nested
              href={`/listings/${conv.listing.id}`}
              className="text-xs text-primary hover:underline"
            >
              {/* @ts-expect-error nested */}
              View listing: {conv.listing.title}
            </Link>
          )}
        </div>
      </aside>

      <ChatRoom
        conversationId={id}
        meId={me.id}
        peer={peer}
        initialMessages={(msgs ?? []) as Message[]}
        listing={
          // @ts-expect-error nested
          conv?.listing ?? null
        }
      />
    </div>
  );
}
