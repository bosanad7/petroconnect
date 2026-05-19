"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  listingId: string;
  /** When true → renders a link straight to /checkout/[listingId];
   *  when false → "Awaiting payment" disabled pill (e.g. already paid). */
  enabled?: boolean;
  /** Display label override. */
  label?: string;
  className?: string;
}

/**
 * Shown on the listing detail page when the viewer is the buyer the
 * seller has reserved the listing for. Sends them to /checkout.
 */
export function CheckoutButton({
  listingId,
  enabled = true,
  label = "Proceed to payment",
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <Button variant="outline" disabled className={className}>
        <CreditCard className="size-4" />
        Awaiting payment
      </Button>
    );
  }

  return (
    <Button asChild className={className} onClick={() => setBusy(true)}>
      <Link href={`/checkout/${listingId}`}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        {label}
      </Link>
    </Button>
  );
}
