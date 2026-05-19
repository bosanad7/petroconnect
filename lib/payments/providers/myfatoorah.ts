import type { PaymentProviderAdapter } from "../types";

/**
 * MyFatoorah stub. Replace once you have:
 *   MYFATOORAH_API_KEY=...
 *   MYFATOORAH_BASE_URL=https://api.myfatoorah.com   (or sandbox)
 *
 * SendPayment docs: https://docs.myfatoorah.com/docs/send-payment
 * Webhook docs:     https://docs.myfatoorah.com/docs/web-hook
 */
export const myfatoorahProvider: PaymentProviderAdapter = {
  id: "myfatoorah",
  label: "MyFatoorah",
  isEnabled() {
    return Boolean(process.env.MYFATOORAH_API_KEY);
  },
  async createCheckout() {
    throw new Error(
      "MyFatoorah provider is not yet implemented. Set MYFATOORAH_API_KEY and fill in lib/payments/providers/myfatoorah.ts.",
    );
  },
  async parseWebhook() {
    // To be implemented — verify the `MyFatoorah-Signature` header,
    // map their event payload to { providerPaymentId, status }.
    return null;
  },
};
