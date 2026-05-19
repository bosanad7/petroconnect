"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[100dvh] sticky top-0 px-4 py-6 bg-card border-r border-border">
      <Logo className="px-2 mb-9" />

      <nav className="flex-1 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={
              pathname === item.href || pathname.startsWith(item.href + "/")
            }
          />
        ))}

        {/* Create listing — accented CTA */}
        <Link
          href="/create"
          className={cn(
            "mt-3 group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
            "text-foreground border border-dashed border-orange-200 bg-primary-soft",
            "hover:border-primary/60 hover:bg-orange-100 transition-all duration-300",
          )}
        >
          <span className="grid place-items-center size-7 rounded-lg text-white shadow-orange group-hover:brightness-105 transition"
            style={{
              background:
                "linear-gradient(140deg, #FF8533 0%, #FF6A00 100%)",
            }}
          >
            <PlusCircle className="size-4" />
          </span>
          <span>New listing</span>
        </Link>

        {userId && (
          <NavLink
            item={{ href: `/profile/${userId}`, label: "Profile", icon: User }}
            active={pathname.startsWith("/profile")}
            className="mt-3"
          />
        )}
      </nav>

      {isAdmin && (
        <div className="pt-4 mt-4 border-t border-border">
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              pathname.startsWith("/admin")
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent",
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

function NavLink({
  item,
  active,
  className,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-primary-soft border border-orange-100"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <Icon className="relative size-4 shrink-0" />
      <span className="relative">{item.label}</span>
    </Link>
  );
}
