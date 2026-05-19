import type { PaymentProvider, PaymentStatus } from "@/types/database";

export interface CheckoutInput {
  paymentId: string;
  listingId: string;
  amount: number;          // in KWD
  platformFee: number;
  total: number;
  currency: "KWD";
  buyerEmail: string | null;
  description: string;
  returnUrl: string;       // where to send the buyer on success
  cancelUrl: string;       // where to send the buyer on cancel/fail
}

export interface CheckoutResult {
  /** Redirect URL the buyer should be sent to. For `mock` this points
   *  back to our own /payment/success handoff. */
  redirectUrl: string;
  /** Opaque ID returned by the provider, persisted on the payment row. */
  providerPaymentId: string;
}

export interface WebhookEvent {
  providerPaymentId: string;
  status: PaymentStatus;
  raw: unknown;
}

/**
 * Common surface every provider plugs into. New gateways (Tap, KNET,
 * MyFatoorah, Apple Pay) only need to implement this.
 */
export interface PaymentProviderAdapter {
  id: PaymentProvider;
  /** Human label shown in the UI selector. */
  label: string;
  /** Whether keys are configured; if false we'd hide the option in the UI. */
  isEnabled(): boolean;
  /** Start a checkout — may call the provider's REST API. */
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Parse a webhook body + headers into a normalized event. */
  parseWebhook(req: Request): Promise<WebhookEvent | null>;
}

export type ProviderRegistry = Record<PaymentProvider, PaymentProviderAdapter>;
