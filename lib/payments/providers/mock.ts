import type { CheckoutInput, CheckoutResult, PaymentProviderAdapter, WebhookEvent } from "../types";

/**
 * Mock provider — works without any real gateway. The "checkout"
 * redirects back to /payment/success with a query param that our
 * confirm route uses to flip the payment to `paid`. Useful for demos
 * and CI; real gateways (Tap, MyFatoorah, KNET) replace this.
 */
export const mockProvider: PaymentProviderAdapter = {
  id: "mock",
  label: "Mock gateway (demo)",
  isEnabled() {
    return true;
  },
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const providerPaymentId = `mock_${input.paymentId}`;
    // The buyer is sent to our own /checkout/[listingId]?step=confirm —
    // the page already has the confirm button. No external redirect.
    return {
      redirectUrl: input.returnUrl,
      providerPaymentId,
    };
  },
  async parseWebhook(req: Request): Promise<WebhookEvent | null> {
    try {
      const body = (await req.json()) as {
        providerPaymentId?: string;
        success?: boolean;
      };
      if (!body.providerPaymentId) return null;
      return {
        providerPaymentId: body.providerPaymentId,
        status: body.success ? "paid" : "failed",
        raw: body,
      };
    } catch {
      return null;
    }
  },
};
