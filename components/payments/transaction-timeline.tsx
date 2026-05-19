import * as React from "react";
import { CheckCircle2, Circle, CircleDashed, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";
import type { PaymentEvent } from "@/types/database";

interface Props {
  events: PaymentEvent[];
  className?: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created:            Circle,
  confirmed_success:  CheckCircle2,
  paid:               CheckCircle2,
  confirmed_failure:  XCircle,
  refunded:           CircleDashed,
};

const LABELS: Record<string, string> = {
  created:           "Payment created",
  confirmed_success: "Buyer confirmed payment",
  paid:              "Payment captured",
  confirmed_failure: "Payment failed",
  refunded:          "Refunded",
};

/**
 * Vertical timeline of payment_events for a single payment.
 * Renders pretty even when the type is something we don't have a label
 * for yet (falls back to a clock icon and the raw event_type).
 */
export function TransactionTimeline({ events, className }: Props) {
  if (events.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No events yet.
      </div>
    );
  }

  // Newest first; the timeline reads top-down with the latest at the top
  const ordered = [...events].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <ol className={cn("relative space-y-4 ps-6", className)}>
      <span
        aria-hidden
        className="absolute left-2 top-2 bottom-2 w-px bg-border"
      />
      {ordered.map((e) => {
        const Icon = ICONS[e.event_type] ?? Clock;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-6 top-0 size-5 rounded-full bg-card border border-border grid place-items-center">
              <Icon className="size-3 text-foreground/70" />
            </span>
            <p className="text-sm font-medium">
              {LABELS[e.event_type] ?? e.event_type.replace(/_/g, " ")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatRelative(e.created_at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
