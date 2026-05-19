"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  CreditCard,
  Flag,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin",                label: "Overview",     icon: LayoutDashboard },
  { href: "/admin/payments",       label: "Payments",     icon: CreditCard },
  { href: "/admin/transactions",   label: "Transactions", icon: Receipt },
  { href: "/admin/listings",       label: "Listings",     icon: Activity },
  { href: "/admin/users",          label: "Members",      icon: Users },
  { href: "/admin/reports",        label: "Trust & safety", icon: ShieldCheck },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 py-2 border-b border-border">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active =
          pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId="admin-tab"
                className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{t.label}</span>
            {/* Adds a faint pill for unread/critical counts later */}
            {t.href === "/admin/reports" && active === false && (
              <span className="relative ml-1 text-[10px] text-muted-foreground">
                <Flag className="size-3 inline -mt-0.5" />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
