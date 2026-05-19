"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Wrench, PlusCircle, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/marketplace", label: "Market", icon: LayoutGrid },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/create", label: "Post", icon: PlusCircle, accent: true },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/profile", label: "Me", icon: User },
];

export function MobileNav({ profileId }: { profileId: string }) {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.06)]">
      <ul className="grid grid-cols-5">
        {NAV.map((item) => {
          const href = item.href === "/profile" ? `/profile/${profileId}` : item.href;
          const active =
            pathname === href || (item.href !== "/profile" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                  item.accent && "relative",
                )}
              >
                <span
                  className={cn(
                    "size-9 grid place-items-center rounded-xl",
                    item.accent
                      ? "text-white shadow-orange"
                      : active
                      ? "bg-primary-soft"
                      : "",
                  )}
                  style={
                    item.accent
                      ? {
                          background:
                            "linear-gradient(140deg, #FF8533 0%, #FF6A00 100%)",
                        }
                      : undefined
                  }
                >
                  <Icon className="size-4" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
