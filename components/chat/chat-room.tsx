"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Send, Tag, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OfferDialog } from "@/components/chat/offer-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatRelative, initials, formatKWD } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Message, OfferData, Profile } from "@/types/database";

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
    seller_id?: string | null;
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

  // True if I'm the listing seller — gates the Accept/Decline actions
  const isSeller = useMemo(
    () => Boolean(listing?.seller_id && listing.seller_id === meId),
    [listing?.seller_id, meId],
  );

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

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Track which offers have been responded to (looking forward in the
  // thread). Avoids showing Accept/Decline buttons on stale offers.
  const responseByOffer = useMemo(() => {
    const map = new Map<string, "accept" | "decline">();
    for (const m of messages) {
      if (m.kind === "offer_response" && m.data && "refers_to" in m.data) {
        const r = m.data as { refers_to: string; action: "accept" | "decline" };
        map.set(r.refers_to, r.action);
      }
    }
    return map;
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
      kind: "text",
      data: null,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    setDraft("");

    const { error, data } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: meId,
        body,
        kind: "text",
      })
      .select("*")
      .single();
    setSending(false);
    if (error || !data) {
      setMessages((p) => p.filter((m) => m.id !== tmpId));
      toast.error("Could not send");
      return;
    }
    const saved = data as Message;
    setMessages((p) => p.map((m) => (m.id === tmpId ? saved : m)));

    // Fire-and-forget moderation. We don't block the chat on it; if the
    // model flags the message it gets stamped server-side and surfaces
    // in the admin queue. We *do* warn the sender for high-severity hits
    // so they can think twice (and because some flags — like sharing
    // bank credentials — are usually accidental).
    void fetch("/api/ai/moderate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: saved.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.flagged) {
          const cats = (res.categories as string[] | undefined)?.join(", ");
          toast.warning("Heads up — that message was flagged", {
            description: cats
              ? `Reason: ${cats}. An admin may review it.`
              : "An admin may review it.",
          });
        }
      })
      .catch(() => {
        /* swallow — moderation is best-effort */
      });
  }

  async function respondToOffer(
    offer: Message,
    action: "accept" | "decline",
  ) {
    if (!offer.data || !("amount" in offer.data)) return;
    const amount = (offer.data as OfferData).amount;
    const ackBody =
      action === "accept"
        ? `Offer accepted: ${formatKWD(amount)}. Reserving the listing.`
        : `Offer declined: ${formatKWD(amount)}.`;

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: meId,
      kind: "offer_response",
      body: ackBody,
      data: { refers_to: offer.id, action },
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    if (action === "accept" && listing?.id && offer.sender_id !== meId) {
      const { error: rpcErr } = await supabase.rpc("mark_listing_reserved", {
        p_listing: listing.id,
        p_buyer: offer.sender_id,
      });
      if (rpcErr) toast.error(`Reserve failed: ${rpcErr.message}`);
      else toast.success("Listing reserved");
    }
  }

  return (
    <div className="flex flex-col rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Avatar>
          <AvatarImage src={peer?.avatar_url ?? undefined} />
          <AvatarFallback>{initials(peer?.full_name ?? "?")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{peer?.full_name ?? "Member"}</p>
          <p className="text-xs text-muted-foreground">
            {peer?.company ?? "K-Company"}{" "}
            {peer?.is_verified && (
              <Badge variant="success" className="ml-1 text-[10px]">
                Verified
              </Badge>
            )}
          </p>
        </div>
        {listing && (
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center gap-2 p-2 rounded-xl bg-muted hover:bg-muted/70 border border-border text-xs transition"
          >
            {listing.images?.[0] && (
              <div className="relative size-9 rounded-md overflow-hidden bg-muted">
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
              <p className="truncate font-medium text-foreground">
                {listing.title}
              </p>
              <p className="text-primary font-semibold">
                {formatKWD(listing.price_kwd)}
              </p>
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
                {m.kind === "offer" ? (
                  <OfferCard
                    offer={m}
                    mine={mine}
                    response={responseByOffer.get(m.id)}
                    canRespond={!mine && isSeller && !responseByOffer.has(m.id)}
                    onRespond={(action) => respondToOffer(m, action)}
                  />
                ) : m.kind === "offer_response" ? (
                  <div
                    className={cn(
                      "max-w-[75%] px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-xs border",
                      (m.data as { action: "accept" | "decline" })?.action ===
                        "accept"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-rose-50 border-rose-100 text-rose-700",
                    )}
                  >
                    {(m.data as { action: "accept" | "decline" })?.action ===
                    "accept" ? (
                      <Check className="size-3" />
                    ) : (
                      <XIcon className="size-3" />
                    )}
                    <span>{m.body}</span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words shadow-xs",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground border border-border rounded-bl-md",
                    )}
                  >
                    {m.body}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-border bg-card flex items-end gap-2">
        {listing && (
          <OfferDialog
            conversationId={conversationId}
            senderId={meId}
            listingAsk={listing.price_kwd}
          />
        )}
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

/* -------------------------------------------------------------------- */

function OfferCard({
  offer,
  mine,
  response,
  canRespond,
  onRespond,
}: {
  offer: Message;
  mine: boolean;
  response?: "accept" | "decline";
  canRespond: boolean;
  onRespond: (action: "accept" | "decline") => void;
}) {
  const amount = (offer.data as OfferData | undefined)?.amount ?? 0;
  const status =
    response === "accept"
      ? "accepted"
      : response === "decline"
      ? "declined"
      : "pending";

  return (
    <div
      className={cn(
        "max-w-[80%] rounded-2xl p-4 border shadow-sm space-y-2",
        mine
          ? "bg-primary/[0.06] border-primary/20 rounded-br-md"
          : "bg-card border-border rounded-bl-md",
        status === "accepted" && "ring-1 ring-emerald-200",
        status === "declined" && "opacity-75",
      )}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Tag className="size-3.5 text-primary" />
        <span>Offer</span>
        {status !== "pending" && (
          <span
            className={cn(
              "ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium",
              status === "accepted"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700",
            )}
          >
            {status}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">
        {formatKWD(amount)}
      </p>
      {canRespond && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onRespond("accept")}
            className="flex-1"
          >
            <Check className="size-4" /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRespond("decline")}
            className="flex-1"
          >
            <XIcon className="size-4" /> Decline
          </Button>
        </div>
      )}
      {!canRespond && status === "pending" && !mine && (
        <p className="text-[11px] text-muted-foreground">
          Waiting on the seller to respond.
        </p>
      )}
    </div>
  );
}
