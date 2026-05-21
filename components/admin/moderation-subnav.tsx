"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/admin/moderation",          label: "Flagged messages", icon: MessageSquare },
  { href: "/admin/moderation/listings", label: "Pending listings", icon: ShoppingBag },
];

export function ModerationSubnav() {
  const pathname = usePathname();
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted/50 p-1 border border-border">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
