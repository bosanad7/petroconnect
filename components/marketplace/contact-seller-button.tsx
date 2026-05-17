"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ContactSellerButton({
  listingId,
  sellerId,
}: {
  listingId: string;
  sellerId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function startConversation() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.id === sellerId) {
      toast.message("This is your own listing");
      setLoading(false);
      return;
    }

    // Find existing conversation
    const { data: existing } = await supabase
      .from("conversation_participants")
      .select("conversation_id, conversations!inner(listing_id)")
      .eq("user_id", user.id);

    const match = (existing ?? []).find(
      // @ts-expect-error nested supabase select
      (row) => row.conversations?.listing_id === listingId,
    );

    let conversationId = match?.conversation_id;

    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({ listing_id: listingId })
        .select("id")
        .single();
      if (error || !conv) {
        toast.error("Could not start conversation");
        setLoading(false);
        return;
      }
      conversationId = conv.id;
      await supabase.from("conversation_participants").insert([
        { conversation_id: conversationId, user_id: user.id },
        { conversation_id: conversationId, user_id: sellerId },
      ]);
    }

    router.push(`/chat/${conversationId}`);
  }

  return (
    <Button size="lg" onClick={startConversation} disabled={loading}>
      <MessageSquare className="size-4" />
      {loading ? "Opening…" : "Message seller"}
    </Button>
  );
}
