"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatRelative, initials, formatKWD } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Message, Profile } from "@/types/database";

interface Props {
  conversationId: string;
  meId: string;
  peer: Profile | null;
  initialMessages: Message[];
  listing: {
    id: string;
    title: string;
    images: string[];
    price_kwd: number | null;
  } | null;
}

export function ChatRoom({
  conversationId,
  meId,
  peer,
  initialMessages,
  listing,
}: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Auto-scroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const tmpId = crypto.randomUUID();
    const optimistic: Message = {
      id: tmpId,
      conversation_id: conversationId,
      sender_id: meId,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    setDraft("");

    const { error, data } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, body })
      .select("*")
      .single();
    setSending(false);
    if (error || !data) {
      setMessages((p) => p.filter((m) => m.id !== tmpId));
      toast.error("Could not send");
      return;
    }
    setMessages((p) =>
      p.map((m) => (m.id === tmpId ? (data as Message) : m)),
    );
  }

  return (
    <div className="flex flex-col rounded-2xl glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <Avatar>
          <AvatarImage src={peer?.avatar_url ?? undefined} />
          <AvatarFallback>{initials(peer?.full_name ?? "?")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{peer?.full_name ?? "Member"}</p>
          <p className="text-xs text-muted-foreground">
            {peer?.company ?? "K-Company"}{" "}
            {peer?.is_verified && <Badge variant="success" className="ml-1 text-[10px]">Verified</Badge>}
          </p>
        </div>
        {listing && (
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center gap-2 p-2 rounded-xl glass-strong text-xs hover:bg-white/10"
          >
            {listing.images?.[0] && (
              <div className="relative size-9 rounded-md overflow-hidden">
                <Image
                  src={listing.images[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
            )}
            <div className="max-w-[180px]">
              <p className="truncate font-medium">{listing.title}</p>
              <p className="text-primary">{formatKWD(listing.price_kwd)}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">
            Be polite. Be professional. Have a great trade.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const prev = messages[i - 1];
          const showStamp =
            !prev ||
            new Date(m.created_at).getTime() -
              new Date(prev.created_at).getTime() >
              5 * 60 * 1000;
          return (
            <div key={m.id} className="space-y-1">
              {showStamp && (
                <p className="text-center text-[10px] text-muted-foreground py-1">
                  {formatRelative(m.created_at)}
                </p>
              )}
              <div
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words",
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "glass-strong rounded-bl-md",
                  )}
                >
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-white/5 flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Type a message…"
          className="min-h-[44px] max-h-32 resize-none py-3"
          rows={1}
        />
        <Button
          onClick={send}
          size="icon"
          disabled={!draft.trim() || sending}
          aria-label="Send"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
