import Link from "next/link";
import { ArrowRight, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import type { Payment } from "@/types/database";
import { formatKWD } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; listing?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireProfile();
  const supabase = await createClient();

  let payment: Payment | null = null;
  if (sp.pid) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("id", sp.pid)
      .single();
    payment = (data as Payment) ?? null;
    if (payment && payment.buyer_id !== me.id && payment.seller_id !== me.id) {
      payment = null;
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card>
        <CardContent className="p-6 sm:p-8 text-center space-y-3">
          <div className="mx-auto size-14 rounded-full bg-rose-50 border border-rose-100 grid place-items-center text-rose-600">
            <XCircle className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment didn&apos;t complete
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We didn&apos;t receive a confirmation from the gateway. Nothing was
            charged. You can retry whenever you&apos;re ready.
          </p>

          {payment && (
            <p className="text-xs text-muted-foreground">
              Reference: <code className="text-foreground/80">{payment.id}</code>
              {" · "}
              <span className="tabular-nums">{formatKWD(payment.total)}</span>
            </p>
          )}

          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            {sp.listing && (
              <Button asChild>
                <Link href={`/checkout/${sp.listing}`}>
                  Retry payment <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/chat">
                <MessageSquare className="size-4" />
                Contact seller
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
