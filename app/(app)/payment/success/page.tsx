import Link from "next/link";
import { CheckCircle2, ArrowRight, MessageSquare, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { TransactionTimeline } from "@/components/payments/transaction-timeline";
import { formatKWD } from "@/lib/utils/format";
import type { Payment, PaymentEvent } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; listing?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireProfile();
  const supabase = await createClient();

  let payment: Payment | null = null;
  let events: PaymentEvent[] = [];

  if (sp.pid) {
    const [{ data: p }, { data: ev }] = await Promise.all([
      supabase.from("payments").select("*").eq("id", sp.pid).single(),
      supabase
        .from("payment_events")
        .select("*")
        .eq("payment_id", sp.pid)
        .order("created_at", { ascending: false }),
    ]);
    payment = (p as Payment) ?? null;
    events = (ev as PaymentEvent[]) ?? [];
  }

  // Sanity: only the buyer/seller can view this receipt
  if (payment && payment.buyer_id !== me.id && payment.seller_id !== me.id) {
    payment = null;
    events = [];
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8 text-center space-y-3">
          <div className="mx-auto size-14 rounded-full bg-emerald-50 border border-emerald-100 grid place-items-center text-emerald-600">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment successful
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The listing is marked as sold and the seller has been notified. You
            can chat with them anytime to arrange handoff.
          </p>

          {payment && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">
                {formatKWD(payment.total)}
              </span>
              <PaymentStatusBadge status={payment.status} />
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            {sp.listing && (
              <Button asChild>
                <Link href={`/listings/${sp.listing}`}>
                  View listing <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/chat">
                <MessageSquare className="size-4" />
                Open messages
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {payment && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Receipt</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Item price"    value={formatKWD(payment.amount)} />
              <Stat label="Platform fee"  value={formatKWD(payment.platform_fee)} />
              <Stat label="Total"         value={formatKWD(payment.total)} bold />
              <Stat label="Method"        value={payment.provider} />
            </div>
            <div className="pt-2 border-t border-border">
              <TransactionTimeline events={events} />
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Reference:{" "}
              <code className="text-foreground/80">{payment.id}</code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 border border-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-sm tabular-nums capitalize ${
          bold ? "font-bold text-primary" : "text-foreground/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
