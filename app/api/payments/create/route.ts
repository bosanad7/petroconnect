import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/payments/providers";
import type { PaymentProvider as ProviderId } from "@/types/database";

export const runtime = "nodejs";

const Body = z.object({
  listing_id: z.string().uuid(),
  provider: z
    .enum(["mock", "myfatoorah", "tap", "knet", "apple_pay", "card"])
    .default("mock"),
});

/**
 * Buyer-initiated: spins up a payment row (idempotent — re-using any
 * existing pending row for this listing) and asks the chosen provider
 * for its checkout URL.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listing_id, provider } = parsed.data;

  // 1. RPC handles validation + creates / returns existing payment id
  const { data: paymentId, error: rpcErr } = await supabase.rpc(
    "create_payment",
    { p_listing: listing_id, p_provider: provider as ProviderId },
  );
  if (rpcErr || !paymentId) {
    return NextResponse.json(
      { error: rpcErr?.message ?? "Could not create payment" },
      { status: 400 },
    );
  }

  // 2. Pull the freshly-created row for provider context
  const { data: payment, error: readErr } = await supabase
    .from("payments")
    .select("*, listing:listings(title)")
    .eq("id", paymentId)
    .single();
  if (readErr || !payment) {
    return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const returnUrl = `${origin}/checkout/${listing_id}?step=confirm&pid=${paymentId}`;
  const cancelUrl = `${origin}/payment/failed?pid=${paymentId}`;

  // 3. Provider handoff (mock returns immediately; real ones may call an API)
  try {
    const adapter = getProvider(provider as ProviderId);
    const result = await adapter.createCheckout({
      paymentId,
      listingId: listing_id,
      amount: Number(payment.amount),
      platformFee: Number(payment.platform_fee),
      total: Number(payment.total),
      currency: "KWD",
      buyerEmail: user.email ?? null,
      description: String((payment as unknown as { listing?: { title?: string } }).listing?.title ?? "PetroConnect order"),
      returnUrl,
      cancelUrl,
    });

    if (result.providerPaymentId) {
      await supabase
        .from("payments")
        .update({
          provider_payment_id: result.providerPaymentId,
          status: "processing",
        })
        .eq("id", paymentId);
    }

    return NextResponse.json({
      payment_id: paymentId,
      redirect_url: result.redirectUrl,
      provider_payment_id: result.providerPaymentId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Provider error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
