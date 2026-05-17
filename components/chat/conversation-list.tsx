"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative, initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface ConvRow {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastReadAt: string | null;
  listing: { id: string; title: string; images: string[] } | null;
  peer?: { id: string; full_name: string | null; avatar_url: string | null };
}

export function ConversationList({ conversations }: { conversations: ConvRow[] }) {
  const pathname = usePathname();

  if (!conversations.length) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Start chatting from any listing's page."
      />
    );
  }

  return (
    <ul className="rounded-2xl glass divide-y divide-white/5 overflow-hidden">
      {conversations.map((c) => {
        const isActive = pathname === `/chat/${c.id}`;
        const unread =
          c.lastMessageAt &&
          (!c.lastReadAt || new Date(c.lastMessageAt) > new Date(c.lastReadAt));
        return (
          <li key={c.id}>
            <Link
              href={`/chat/${c.id}`}
              className={cn(
                "flex gap-3 p-3 hover:bg-white/[0.04] transition",
                isActive && "bg-primary/10",
              )}
            >
              <Avatar>
                <AvatarImage src={c.peer?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {initials(c.peer?.full_name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">
                    {c.peer?.full_name ?? "Member"}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {c.lastMessageAt && formatRelative(c.lastMessageAt)}
                  </span>
                </div>
                {c.listing && (
                  <p className="text-[11px] text-primary truncate">
                    Re: {c.listing.title}
                  </p>
                )}
                <p
                  className={cn(
                    "text-xs truncate",
                    unread
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {c.lastMessage ?? "Start the conversation"}
                </p>
              </div>
              {unread && (
                <span className="self-center size-2 rounded-full bg-primary shrink-0" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
