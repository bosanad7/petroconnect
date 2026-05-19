"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, CheckCheck, MessageSquare, Heart, ShieldAlert, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/types/database";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  favorite: Heart,
  report: ShieldAlert,
  default: Sparkles,
};

interface NotifData {
  conversation_id?: string;
  listing_id?: string;
  [k: string]: unknown;
}

function hrefFor(n: Notification): string {
  const data = (n.data ?? {}) as NotifData;
  if (n.type === "message" && data.conversation_id) {
    return `/chat/${data.conversation_id}`;
  }
  if (n.type === "favorite" && data.listing_id) {
    return `/listings/${data.listing_id}`;
  }
  return "/";
}

export function NotificationsDropdown({ userId }: { userId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const unread = items.filter((n) => !n.is_read).length;

  // Initial fetch + realtime subscription
  useEffect(() => {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemo) {
      const now = Date.now();
      const mk = (
        id: string,
        type: string,
        title: string,
        body: string,
        is_read: boolean,
        minsAgo: number,
        data: NotifData,
      ): Notification => ({
        id,
        user_id: userId,
        type,
        title,
        body,
        is_read,
        data: data as Notification["data"],
        created_at: new Date(now - minsAgo * 60_000).toISOString(),
      });
      setItems([
        mk("d1", "message", "Fatma Al-Mutairi", "Yes, the inspection is still available tomorrow at 5pm.", false, 4, { conversation_id: "conv-1" }),
        mk("d2", "favorite", "Someone saved your listing", "Yousef Al-Enezi saved \"MacBook Pro 14\" M3 Pro\"", false, 73, { listing_id: "listing-4" }),
        mk("d3", "message", "Ahmed Al-Sabah", "Perfect — let's start with two sessions next week.", true, 24 * 60, { conversation_id: "conv-2" }),
      ]);
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (mounted) {
        setItems((data ?? []) as Notification[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as Notification;
          setItems((prev) =>
            prev.some((x) => x.id === next.id) ? prev : [next, ...prev].slice(0, 20),
          );
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }, [supabase, userId, unread]);

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    },
    [supabase],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative size-10 grid place-items-center rounded-xl hover:bg-muted transition ring-focus"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      >
        <AnimatePresence mode="wait">
          {unread > 0 ? (
            <motion.div
              key="ring"
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.6 }}
              className="text-primary"
            >
              <BellRing className="size-5" />
            </motion.div>
          ) : (
            <motion.div
              key="bell"
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.6 }}
            >
              <Bell className="size-5" />
            </motion.div>
          )}
        </AnimatePresence>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center shadow-[0_0_0_2px_hsl(var(--background))]"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread === 0
                ? "You're all caught up"
                : `${unread} unread`}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <div className="size-10 mx-auto rounded-2xl glass grid place-items-center text-muted-foreground mb-3">
                <Bell className="size-4" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Activity on your listings will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? ICONS.default;
                return (
                  <li key={n.id}>
                    <Link
                      href={hrefFor(n)}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex gap-3 px-4 py-3 hover:bg-muted/60 transition",
                        !n.is_read && "bg-primary/[0.05]",
                      )}
                    >
                      <span
                        className={cn(
                          "size-9 shrink-0 grid place-items-center rounded-xl border",
                          !n.is_read
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                          {formatRelative(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="size-2 self-center rounded-full bg-primary shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
