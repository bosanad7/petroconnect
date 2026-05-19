import * as React from "react";
import {
  CheckCircle2,
  Clock,
  CircleAlert,
  RefreshCcw,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PaymentStatus } from "@/types/database";

const MAP: Record<
  PaymentStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  pending:    { label: "Pending",    icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-100" },
  processing: { label: "Processing", icon: Loader2,      cls: "bg-blue-50 text-blue-700 border-blue-100" },
  paid:       { label: "Paid",       icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  failed:     { label: "Failed",     icon: XCircle,      cls: "bg-rose-50 text-rose-700 border-rose-100" },
  refunded:   { label: "Refunded",   icon: RefreshCcw,   cls: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelled:  { label: "Cancelled",  icon: CircleAlert,  cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function PaymentStatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: PaymentStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const cfg = MAP[status];
  const Icon = cfg.icon;
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wider",
        pad,
        cfg.cls,
        className,
      )}
    >
      <Icon
        className={cn(
          "size-3",
          status === "processing" && "animate-spin",
        )}
      />
      {cfg.label}
    </span>
  );
}
