import type { KCompany, ListingCondition } from "@/types/database";

export const APP_NAME = "PetroConnect";
export const APP_TAGLINE = "The trusted marketplace for Kuwait's oil sector";

export const K_COMPANIES: { value: KCompany; label: string; domain: string }[] = [
  { value: "KPC", label: "Kuwait Petroleum Corp.", domain: "kpc.com.kw" },
  { value: "KOC", label: "Kuwait Oil Company", domain: "kockw.com" },
  { value: "KNPC", label: "Kuwait National Petroleum Co.", domain: "knpc.com" },
  { value: "KIPIC", label: "Kuwait Integrated Petroleum Industries", domain: "kipic.com.kw" },
  { value: "PIC", label: "Petrochemical Industries Co.", domain: "pic.com.kw" },
  { value: "KGOC", label: "Kuwait Gulf Oil Company", domain: "kgoc.com" },
  { value: "KUFPEC", label: "Kuwait Foreign Petroleum Exploration", domain: "kufpec.com" },
  { value: "KOTC", label: "Kuwait Oil Tanker Company", domain: "kotc.com.kw" },
  { value: "KAFCO", label: "Kuwait Aviation Fueling Co.", domain: "kafco.com.kw" },
  { value: "Q8", label: "Q8 (KPI)", domain: "q8.com" },
];

export const ALLOWED_DOMAINS = K_COMPANIES.map((c) => c.domain);

export function detectCompany(email: string): KCompany | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  for (const c of K_COMPANIES) if (domain.endsWith(c.domain)) return c.value;
  return null;
}

export const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For parts" },
];

export const KUWAIT_AREAS = [
  "Kuwait City","Hawalli","Salmiya","Jabriya","Salwa","Mishref",
  "Fahaheel","Ahmadi","Mangaf","Mahboula","Fintas","Jahra","Sabah Al Salem",
];
