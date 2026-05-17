"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Wrench,
  MessageSquare,
  Bookmark,
  PlusCircle,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";

const NAV = [
  { href: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/create", label: "New listing", icon: PlusCircle, accent: true },
];

export function Sidebar({
  isAdmin = false,
  userId,
}: {
  isAdmin?: boolean;
  userId?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[100dvh] sticky top-0 px-4 py-6 border-r border-white/5">
      <Logo className="px-2 mb-8" />

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                item.accent &&
                  !active &&
                  "text-foreground border border-dashed border-white/15",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        {userId && (
          <Link
            href={`/profile/${userId}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              pathname.startsWith("/profile")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            <User className="size-4" />
            Profile
          </Link>
        )}
      </nav>

      {isAdmin && (
        <div className="pt-4 mt-4 border-t border-white/5">
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              pathname.startsWith("/admin")
                ? "bg-amber-500/15 text-amber-400"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            <Shield className="size-4" />
            Admin
          </Link>
        </div>
      )}
    </aside>
  );
}
