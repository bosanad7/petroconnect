import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/payments/providers";
import type { PaymentProvider } from "@/types/database";

export const runtime = "nodejs";

/**
 * Generic webhook entrypoint. Real gateways post to
 *   /api/payments/webhook?provider=tap
 * with their event body. We:
 *   1. Verify the signature (provider-specific) inside parseWebhook()
 *   2. Look the payment up by provider_payment_id
 *   3. Use the service-role client to flip status — bypasses RLS
 *      because webhooks have no auth.uid()
 */
export async function POST(req: Request) {
  const providerId = (new URL(req.url).searchParams.get("provider") ??
    "mock") as PaymentProvider;
  const adapter = getProvider(providerId);

  const event = await adapter.parseWebhook(req.clone());
  if (!event) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  // Audit the raw webhook regardless of outcome — handy when debugging
  const service = await createServiceClient();

  const { data: payment } = await service
    .from("payments")
    .select("id")
    .eq("provider_payment_id", event.providerPaymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  }

  await service.from("payment_events").insert({
    payment_id: payment.id,
    event_type: `webhook:${event.status}`,
    payload: { raw: event.raw },
  });

  // Flip status — but only if not already terminal
  const patch: Record<string, unknown> = { status: event.status };
  if (event.status === "paid") patch.paid_at = new Date().toISOString();
  if (event.status === "failed") patch.failed_at = new Date().toISOString();
  if (event.status === "refunded") patch.refunded_at = new Date().toISOString();

  const { error } = await service
    .from("payments")
    .update(patch)
    .eq("id", payment.id)
    .in("status", ["pending", "processing"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
