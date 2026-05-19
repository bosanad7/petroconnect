import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  payment_id: z.string().uuid(),
  success: z.boolean().default(true),
  provider_payment_id: z.string().optional(),
});

/**
 * Buyer-confirm endpoint (mock provider). Real gateways go through
 * `/api/payments/webhook` instead. Both ultimately call the same
 * `confirm_payment` RPC, which trips the on-paid trigger that flips
 * the listing to sold + writes the transaction row + notifies both
 * parties.
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

  const { payment_id, success, provider_payment_id } = parsed.data;

  const { error } = await supabase.rpc("confirm_payment", {
    p_payment: payment_id,
    p_provider_payment_id: provider_payment_id ?? `mock_${payment_id}`,
    p_success: success,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: success ? "paid" : "failed" });
}
