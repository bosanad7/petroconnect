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

    // Single RPC handles both: find existing 1:1 conversation, or create
    // it + add both participants atomically. Done server-side so RLS
    // doesn't trip on the read-after-insert race.
    const { data: conversationId, error } = await supabase.rpc(
      "start_conversation",
      { p_listing: listingId, p_peer: sellerId },
    );

    if (error || !conversationId) {
      toast.error(error?.message ?? "Could not start conversation");
      setLoading(false);
      return;
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
