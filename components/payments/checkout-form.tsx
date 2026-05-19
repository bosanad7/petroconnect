"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentMethodSelector } from "./payment-method-selector";
import type { PaymentProvider } from "@/types/database";

interface Props {
  listingId: string;
  defaultStep?: "select" | "confirm";
  existingPaymentId?: string | null;
}

/**
 * Drives the buyer through:
 *   select method  →  POST /api/payments/create  →  confirm  →  /payment/success
 *
 * Real gateways will redirect away from our domain in `createCheckout`;
 * the mock provider stays in-app, so we surface the confirm CTA here.
 */
export function CheckoutForm({
  listingId,
  defaultStep = "select",
  existingPaymentId = null,
}: Props) {
  const router = useRouter();
  const [provider, setProvider] = useState<PaymentProvider>("mock");
  const [step, setStep] = useState<"select" | "confirm">(defaultStep);
  const [paymentId, setPaymentId] = useState<string | null>(existingPaymentId);
  const [pending, startTransition] = useTransition();

  async function createPayment() {
    startTransition(async () => {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not start payment");
        return;
      }

      setPaymentId(data.payment_id);

      // Real providers return an off-domain redirect URL; the mock provider
      // returns our own /checkout?step=confirm.
      if (data.redirect_url && data.redirect_url.startsWith("http") && !data.redirect_url.startsWith(window.location.origin)) {
        window.location.href = data.redirect_url;
        return;
      }
      setStep("confirm");
    });
  }

  async function confirmPayment(success: boolean) {
    if (!paymentId) return;
    startTransition(async () => {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, success }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not confirm");
        return;
      }
      if (success) {
        toast.success("Payment confirmed");
        router.replace(`/payment/success?listing=${listingId}&pid=${paymentId}`);
      } else {
        toast.error("Payment failed");
        router.replace(`/payment/failed?listing=${listingId}&pid=${paymentId}`);
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-5">
        {step === "select" ? (
          <>
            <PaymentMethodSelector value={provider} onChange={setProvider} />

            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
              <Lock className="size-3.5 mt-0.5 shrink-0" />
              <p>
                Your payment is processed inside the PetroConnect network. We
                never share your contact details with the seller.
              </p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={createPayment}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Continue to {provider === "mock" ? "demo" : "payment"}
            </Button>
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <div className="size-12 rounded-full bg-primary-soft text-primary grid place-items-center">
                <Lock className="size-5" />
              </div>
              <h3 className="font-semibold">Confirm payment</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                In production this is where the real gateway takes over.
                For the demo, confirm or simulate a failure below.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <Button
                size="lg"
                onClick={() => confirmPayment(true)}
                disabled={pending}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Confirm payment
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => confirmPayment(false)}
                disabled={pending}
              >
                <X className="size-4" />
                Simulate failure
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
