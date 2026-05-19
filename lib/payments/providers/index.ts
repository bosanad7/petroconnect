import { mockProvider } from "./mock";
import { myfatoorahProvider } from "./myfatoorah";
import { tapProvider } from "./tap";
import { knetProvider } from "./knet";
import type { PaymentProviderAdapter } from "../types";
import type { PaymentProvider } from "@/types/database";

const REGISTRY: Record<PaymentProvider, PaymentProviderAdapter> = {
  mock:       mockProvider,
  myfatoorah: myfatoorahProvider,
  tap:        tapProvider,
  knet:       knetProvider,
  // apple_pay + card are routed via one of the real providers above.
  apple_pay:  mockProvider,
  card:       mockProvider,
};

export function getProvider(id: PaymentProvider): PaymentProviderAdapter {
  return REGISTRY[id] ?? mockProvider;
}

/** All providers currently enabled (have keys configured). Always
 *  includes the mock provider so the demo flow keeps working. */
export function listEnabledProviders(): PaymentProviderAdapter[] {
  const all = Object.values(REGISTRY);
  const seen = new Set<string>();
  return all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return p.isEnabled();
  });
}
