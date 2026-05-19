import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import { PaymentSummaryCard } from "@/components/payments/payment-summary-card";
import { CheckoutForm } from "@/components/payments/checkout-form";
import { computeFeeKwd, feeRateText } from "@/lib/payments/fees";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ step?: string; pid?: string }>;
}) {
  const { listingId } = await params;
  const sp = await searchParams;

  const me = await requireProfile();
  const supabase = await createClient();

  // Pull the listing + seller info; RLS keeps non-participants out anyway,
  // but a clean 404 here is friendlier than a partial render.
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, images, location, price_kwd, status, seller_id, reserved_for, sold_to, seller:profiles!seller_id(full_name, company)",
    )
    .eq("id", listingId)
    .single();

  if (!listing) notFound();

  // Permission: only the reserved buyer or someone who's already a paid
  // buyer can land here.
  const isReservedBuyer = listing.reserved_for === me.id;
  const isPaidBuyer     = listing.sold_to     === me.id;
  if (!isReservedBuyer && !isPaidBuyer) {
    redirect(`/listings/${listingId}`);
  }

  // If the listing is already sold to this buyer, jump straight to success.
  if (listing.status === "sold") {
    redirect(`/payment/success?listing=${listingId}`);
  }

  const amount = Number(listing.price_kwd ?? 0);
  const platformFee = computeFeeKwd(amount);
  const total = Math.round((amount + platformFee) * 1000) / 1000;

  const seller = (listing as unknown as { seller: { full_name: string | null; company: string | null } }).seller;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href={`/listings/${listingId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1" /> Back to listing
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Review the order and confirm payment. You can pay in-person on
          delivery; this only authorises the trade.
        </p>
      </div>

      <PaymentSummaryCard
        listing={{
          title: listing.title,
          images: listing.images,
          location: listing.location,
        }}
        seller={{ full_name: seller?.full_name ?? null, company: seller?.company ?? null }}
        buyer={{ full_name: me.full_name, email: me.email }}
        amount={amount}
        platformFee={platformFee}
        total={total}
        feeRateText={feeRateText()}
      />

      <CheckoutForm
        listingId={listingId}
        defaultStep={sp.step === "confirm" ? "confirm" : "select"}
        existingPaymentId={sp.pid ?? null}
      />
    </div>
  );
}
