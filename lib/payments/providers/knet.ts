import type { PaymentProviderAdapter } from "../types";

/**
 * KNET (Kuwait's national payment gateway) stub. Typically routed via
 * a Kuwait bank's PG (NBK, KFH, Burgan) which exposes its own API.
 *
 * Set KNET_BASE_URL, KNET_MERCHANT_ID, KNET_TERMINAL_ID and implement.
 */
export const knetProvider: PaymentProviderAdapter = {
  id: "knet",
  label: "KNET",
  isEnabled() {
    return Boolean(process.env.KNET_MERCHANT_ID);
  },
  async createCheckout() {
    throw new Error(
      "KNET provider is not yet implemented. Configure KNET_* env vars and fill in lib/payments/providers/knet.ts.",
    );
  },
  async parseWebhook() {
    return null;
  },
};
