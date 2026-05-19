import type { PaymentProviderAdapter } from "../types";

/**
 * Tap Payments stub. Set TAP_SECRET_KEY=sk_test_... and implement the
 * /v2/charges/ flow per https://developers.tap.company/.
 */
export const tapProvider: PaymentProviderAdapter = {
  id: "tap",
  label: "Tap Payments",
  isEnabled() {
    return Boolean(process.env.TAP_SECRET_KEY);
  },
  async createCheckout() {
    throw new Error(
      "Tap provider is not yet implemented. Set TAP_SECRET_KEY and fill in lib/payments/providers/tap.ts.",
    );
  },
  async parseWebhook() {
    return null;
  },
};
