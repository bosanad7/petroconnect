// =====================================================================
// Demo mode — mock data + bypass so the UI is fully clickable without a
// real Supabase project. Enabled by NEXT_PUBLIC_DEMO_MODE=true.
// =====================================================================

import type {
  Category,
  Conversation,
  Listing,
  ListingWithSeller,
  Message,
  Profile,
} from "@/types/database";

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ---------------------------------------------------------------------
// PROFILES
// ---------------------------------------------------------------------
const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();

export const DEMO_ME: Profile = {
  id: "demo-me",
  email: "demo@kpc.com.kw",
  full_name: "Rashed Al-Rashed",
  avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Rashed%20AlRashed&backgroundColor=2563eb",
  phone: null,
  company: "KPC",
  department: "Operations",
  job_title: "Senior Engineer",
  bio: "Demo account — explore PetroConnect without a real backend.",
  is_verified: true,
  role: "admin",
  rating_avg: 4.9,
  rating_count: 12,
  created_at: daysAgo(120),
  updated_at: daysAgo(2),
};

export const DEMO_SELLERS: Profile[] = [
  {
    id: "seller-1",
    email: "ahmed@knpc.com",
    full_name: "Ahmed Al-Sabah",
    avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Ahmed%20AlSabah&backgroundColor=059669",
    phone: null,
    company: "KNPC",
    department: "Refining",
    job_title: "Process Engineer",
    bio: "Refining engineer at KNPC Mina Al-Ahmadi.",
    is_verified: true,
    role: "member",
    rating_avg: 4.8,
    rating_count: 7,
    created_at: daysAgo(60),
    updated_at: daysAgo(3),
  },
  {
    id: "seller-2",
    email: "fatma@koc.com.kw",
    full_name: "Fatma Al-Mutairi",
    avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Fatma%20AlMutairi&backgroundColor=db2777",
    phone: null,
    company: "KOC",
    department: "Drilling",
    job_title: "Drilling Supervisor",
    bio: "12 years at Kuwait Oil Company. Always upgrading my gear.",
    is_verified: true,
    role: "member",
    rating_avg: 5.0,
    rating_count: 19,
    created_at: daysAgo(220),
    updated_at: daysAgo(1),
  },
  {
    id: "seller-3",
    email: "yousef@kipic.com.kw",
    full_name: "Yousef Al-Enezi",
    avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Yousef%20AlEnezi&backgroundColor=ea580c",
    phone: null,
    company: "KIPIC",
    department: "Logistics",
    job_title: "Logistics Lead",
    bio: null,
    is_verified: true,
    role: "member",
    rating_avg: 4.6,
    rating_count: 5,
    created_at: daysAgo(45),
    updated_at: daysAgo(8),
  },
];

export const ALL_DEMO_PROFILES = [DEMO_ME, ...DEMO_SELLERS];

// ---------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------
export const DEMO_CATEGORIES: Category[] = [
  { id: "cat-electronics", slug: "electronics", name: "Electronics", kind: "product", icon: "laptop", sort_order: 1 },
  { id: "cat-vehicles",    slug: "vehicles",    name: "Vehicles & Parts", kind: "product", icon: "car", sort_order: 2 },
  { id: "cat-furniture",   slug: "furniture",   name: "Furniture", kind: "product", icon: "sofa", sort_order: 3 },
  { id: "cat-appliances",  slug: "home-appliances", name: "Home Appliances", kind: "product", icon: "refrigerator", sort_order: 4 },
  { id: "cat-industrial",  slug: "industrial",  name: "Industrial / Safety Gear", kind: "product", icon: "hard-hat", sort_order: 7 },
  { id: "cat-tools",       slug: "tools",       name: "Tools & Equipment", kind: "product", icon: "wrench", sort_order: 8 },
  { id: "cat-other-prod",  slug: "other-product", name: "Other", kind: "product", icon: "package", sort_order: 99 },

  { id: "cat-tutoring",    slug: "tutoring",    name: "Tutoring & Training", kind: "service", icon: "graduation-cap", sort_order: 1 },
  { id: "cat-technical",   slug: "technical",   name: "Technical / Engineering", kind: "service", icon: "cog", sort_order: 2 },
  { id: "cat-it",          slug: "it-services", name: "IT / Software", kind: "service", icon: "code", sort_order: 7 },
  { id: "cat-consulting",  slug: "consulting",  name: "Consulting", kind: "service", icon: "briefcase", sort_order: 8 },
];

// ---------------------------------------------------------------------
// LISTINGS
// ---------------------------------------------------------------------
const img = (path: string, w = 1200) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&w=${w}&q=80`;

const PRODUCTS: Omit<Listing, "search_tsv">[] = [
  {
    id: "listing-1",
    seller_id: "seller-2",
    kind: "product",
    title: "Toyota Land Cruiser GXR 2018 — 90,000 km",
    description:
      "Single-owner Land Cruiser GXR in pristine condition. Full service history at Al-Sayer, all original parts, no accidents. Recently fitted with new Yokohama tires and a fresh oil service. Selling because I'm relocating.\n\nFeatures: leather interior, sunroof, rear entertainment, premium JBL audio. Available for inspection in Salmiya.",
    category_id: "cat-vehicles",
    condition: "good",
    price_kwd: 8500.000,
    is_negotiable: true,
    location: "Salmiya",
    images: [
      img("photo-1503376780353-7e6692767b70"),
      img("photo-1542362567-b07e54358753"),
      img("photo-1494976388531-d1058494cdd8"),
    ],
    status: "active",
    is_featured: true,
    views: 412,
    ai_score: 0.08,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: "listing-2",
    seller_id: "seller-1",
    kind: "product",
    title: "iPhone 15 Pro Max 256GB — Natural Titanium",
    description:
      "Bought 4 months ago from Xcite. Box, charger, and original receipt included. Always kept in a case with screen protector — looks brand new.\n\nUpgrading to the 16 Pro, no other reason for selling. AppleCare+ valid until April 2026.",
    category_id: "cat-electronics",
    condition: "like_new",
    price_kwd: 320.000,
    is_negotiable: false,
    location: "Hawalli",
    images: [
      img("photo-1592286927505-1def25115558"),
      img("photo-1695048065329-8c8d4f7c0f97"),
    ],
    status: "active",
    is_featured: true,
    views: 287,
    ai_score: 0.05,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: "listing-3",
    seller_id: "seller-3",
    kind: "product",
    title: "Herman Miller Aeron Chair — Size B",
    description:
      "Genuine Herman Miller Aeron, size B (medium). 6 years old but in great condition — adjustable lumbar, forward tilt, fully posture-fit. Selling because the office is moving and we got new chairs.",
    category_id: "cat-furniture",
    condition: "good",
    price_kwd: 180.000,
    is_negotiable: true,
    location: "Ahmadi",
    images: [
      img("photo-1592078615290-033ee584e267"),
      img("photo-1580480055273-228ff5388ef8"),
    ],
    status: "active",
    is_featured: false,
    views: 91,
    ai_score: 0.04,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: "listing-4",
    seller_id: "seller-2",
    kind: "product",
    title: "MacBook Pro 14\" M3 Pro · 18GB / 1TB",
    description:
      "MacBook Pro 14\" with M3 Pro chip, 18GB RAM, 1TB SSD. Purchased Jan 2026. Cycle count 38. Used only for light dev work and presentations. Includes original 96W charger.",
    category_id: "cat-electronics",
    condition: "like_new",
    price_kwd: 580.000,
    is_negotiable: true,
    location: "Kuwait City",
    images: [
      img("photo-1517336714731-489689fd1ca8"),
      img("photo-1496181133206-80ce9b88a853"),
    ],
    status: "active",
    is_featured: true,
    views: 198,
    ai_score: 0.06,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: "listing-5",
    seller_id: "seller-1",
    kind: "product",
    title: "MSA V-Gard Safety Helmet (set of 6)",
    description:
      "Six brand new MSA V-Gard safety helmets, unused, still in plastic. Bought a bulk order and we ended up not needing them. Specs: ANSI Z89.1 Type I, Class E. Adjustable Fas-Trac III suspension.",
    category_id: "cat-industrial",
    condition: "new",
    price_kwd: 65.500,
    is_negotiable: false,
    location: "Ahmadi",
    images: [
      img("photo-1581094271901-8022df4466f9"),
      img("photo-1565514020179-026b92b2d70b"),
    ],
    status: "active",
    is_featured: false,
    views: 44,
    ai_score: 0.02,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
  },
  {
    id: "listing-6",
    seller_id: "seller-3",
    kind: "product",
    title: "Samsung 65\" QLED Q70C — 2024 Model",
    description:
      "65-inch Samsung QLED, bought less than a year ago. 4K, 120Hz, Quantum HDR, Tizen smart TV. Excellent picture quality, no dead pixels. Comes with original remote and wall mount bracket.",
    category_id: "cat-appliances",
    condition: "like_new",
    price_kwd: 240.000,
    is_negotiable: true,
    location: "Jabriya",
    images: [
      img("photo-1593359677879-a4bb92f829d1"),
    ],
    status: "active",
    is_featured: false,
    views: 134,
    ai_score: 0.07,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(8),
    updated_at: daysAgo(8),
  },
  {
    id: "listing-7",
    seller_id: "seller-2",
    kind: "product",
    title: "Milwaukee M18 FUEL Drill Combo Kit",
    description:
      "M18 FUEL hammer drill + impact driver combo. Comes with 2× 5.0Ah batteries, fast charger, and Milwaukee carry bag. Used for one home renovation project, otherwise stored.",
    category_id: "cat-tools",
    condition: "good",
    price_kwd: 95.000,
    is_negotiable: true,
    location: "Fahaheel",
    images: [
      img("photo-1581244277943-fe4a9c777189"),
    ],
    status: "active",
    is_featured: false,
    views: 62,
    ai_score: 0.03,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(11),
    updated_at: daysAgo(11),
  },
  {
    id: "listing-8",
    seller_id: "seller-1",
    kind: "product",
    title: "PlayStation 5 + 2 controllers + 3 games",
    description:
      "PS5 disc edition. Excellent condition, lightly used. Includes 2 DualSense controllers (one in midnight black), and 3 games: FIFA 24, GT7, Spider-Man 2. Original packaging included.",
    category_id: "cat-electronics",
    condition: "good",
    price_kwd: 145.000,
    is_negotiable: true,
    location: "Salwa",
    images: [
      img("photo-1606813907291-d86efa9b94db"),
    ],
    status: "active",
    is_featured: false,
    views: 221,
    ai_score: 0.09,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
];

const SERVICES: Omit<Listing, "search_tsv">[] = [
  {
    id: "service-1",
    seller_id: "seller-1",
    kind: "service",
    title: "AutoCAD & Plant 3D tutoring — weekday evenings",
    description:
      "10 years of refining + petrochemical CAD experience. I offer one-on-one tutoring in AutoCAD, Plant 3D, and Navisworks for engineering students and junior staff preparing for promotion exams. Online or in-person around Hawalli.\n\nPackages: 5 sessions / 10 sessions. First 30-minute consult is free.",
    category_id: "cat-tutoring",
    condition: null,
    price_kwd: 12.000,
    is_negotiable: true,
    location: "Hawalli",
    images: [
      img("photo-1551434678-e076c223a692"),
    ],
    status: "active",
    is_featured: true,
    views: 178,
    ai_score: 0.02,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
  },
  {
    id: "service-2",
    seller_id: "seller-3",
    kind: "service",
    title: "Arabic ↔ English technical translation",
    description:
      "Certified translator with 8 years of experience translating engineering reports, HSE documentation, and audit findings. Specialty: oil & gas terminology, ASME/API standards. Confidentiality guaranteed.",
    category_id: "cat-consulting",
    condition: null,
    price_kwd: 0.025,
    is_negotiable: false,
    location: "Kuwait City",
    images: [
      img("photo-1521295121783-8a321d551ad2"),
    ],
    status: "active",
    is_featured: false,
    views: 89,
    ai_score: 0.02,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
  },
  {
    id: "service-3",
    seller_id: "seller-2",
    kind: "service",
    title: "Personal IT helpdesk — home network & smart home",
    description:
      "After-hours IT help for fellow K-Company employees. I'll come to your home, set up your router/mesh Wi-Fi, troubleshoot printers, configure smart home devices, and back up your photos. Flat fee per visit.",
    category_id: "cat-it",
    condition: null,
    price_kwd: 15.000,
    is_negotiable: true,
    location: "Salmiya",
    images: [
      img("photo-1518770660439-4636190af475"),
    ],
    status: "active",
    is_featured: false,
    views: 41,
    ai_score: 0.03,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(13),
    updated_at: daysAgo(13),
  },
  {
    id: "request-1",
    seller_id: "seller-1",
    kind: "service_request",
    title: "Looking for: Process simulation tutor (Aspen Plus)",
    description:
      "Need 4–6 sessions of Aspen Plus tutoring focused on distillation columns and heat exchangers. Preparing for a promotion exam in 6 weeks. Online preferred. Will pay fair rate for the right tutor.",
    category_id: "cat-technical",
    condition: null,
    price_kwd: null,
    is_negotiable: true,
    location: "Online",
    images: [],
    status: "active",
    is_featured: false,
    views: 17,
    ai_score: 0.01,
    ai_flags: null,
    reserved_for: null,
    sold_to: null,
    sold_at: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
];

const ALL_LISTINGS: Omit<Listing, "search_tsv">[] = [...PRODUCTS, ...SERVICES];

function joinSeller(l: Omit<Listing, "search_tsv">): ListingWithSeller {
  const seller =
    ALL_DEMO_PROFILES.find((p) => p.id === l.seller_id) ?? DEMO_SELLERS[0];
  const category =
    DEMO_CATEGORIES.find((c) => c.id === l.category_id) ?? null;
  return { ...(l as Listing), seller, category };
}

export const DEMO_LISTINGS: ListingWithSeller[] = ALL_LISTINGS.map(joinSeller);

export function demoListingsByKind(
  kind: "product" | "service" | "service_request",
) {
  return DEMO_LISTINGS.filter((l) => l.kind === kind);
}

export function demoFindListing(id: string) {
  return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
}

export function demoListingsForSeller(id: string) {
  return DEMO_LISTINGS.filter((l) => l.seller_id === id);
}

export function demoFavoriteIds() {
  return new Set(["listing-1", "listing-4", "service-1"]);
}

// ---------------------------------------------------------------------
// CONVERSATIONS / MESSAGES
// ---------------------------------------------------------------------
export const DEMO_CONVERSATIONS: Array<
  Conversation & {
    peer: Profile;
    listing: { id: string; title: string; images: string[]; price_kwd: number | null };
    lastReadAt: string | null;
  }
> = [
  {
    id: "conv-1",
    listing_id: "listing-1",
    last_message: "Yes, the inspection is still available tomorrow at 5pm.",
    last_message_at: daysAgo(0),
    created_at: daysAgo(2),
    peer: DEMO_SELLERS[1],
    listing: {
      id: "listing-1",
      title: "Toyota Land Cruiser GXR 2018",
      images: DEMO_LISTINGS[0].images,
      price_kwd: 8500.0,
    },
    lastReadAt: daysAgo(2),
  },
  {
    id: "conv-2",
    listing_id: "service-1",
    last_message: "Perfect — let's start with two sessions next week.",
    last_message_at: daysAgo(1),
    created_at: daysAgo(3),
    peer: DEMO_SELLERS[0],
    listing: {
      id: "service-1",
      title: "AutoCAD & Plant 3D tutoring",
      images: DEMO_LISTINGS.find((l) => l.id === "service-1")?.images ?? [],
      price_kwd: 12.0,
    },
    lastReadAt: daysAgo(1),
  },
  {
    id: "conv-3",
    listing_id: "listing-4",
    last_message: "Sounds good, I'll bring cash.",
    last_message_at: daysAgo(4),
    created_at: daysAgo(5),
    peer: DEMO_SELLERS[2],
    listing: {
      id: "listing-4",
      title: "MacBook Pro 14\" M3 Pro",
      images: DEMO_LISTINGS.find((l) => l.id === "listing-4")?.images ?? [],
      price_kwd: 580.0,
    },
    lastReadAt: daysAgo(4),
  },
];

export function demoMessagesFor(convId: string): Message[] {
  const base = ((): { fromMe: boolean; body: string; mins: number }[] => {
    switch (convId) {
      case "conv-1":
        return [
          { fromMe: true,  body: "Hi Fatma, is the Land Cruiser still available?", mins: 60 * 26 },
          { fromMe: false, body: "Hi Rashed — yes it is. When would you like to come see it?", mins: 60 * 25 },
          { fromMe: true,  body: "Tomorrow evening if possible. Around 5pm?", mins: 60 * 24 },
          { fromMe: false, body: "Yes, the inspection is still available tomorrow at 5pm.", mins: 1 },
        ];
      case "conv-2":
        return [
          { fromMe: true,  body: "Hi Ahmed, are you taking new students this month?", mins: 60 * 50 },
          { fromMe: false, body: "Yes! I have two slots open on Tuesday/Thursday evenings.", mins: 60 * 49 },
          { fromMe: true,  body: "Great — can we do a free intro session first?", mins: 60 * 48 },
          { fromMe: false, body: "Of course. Tuesday 7pm works?", mins: 60 * 26 },
          { fromMe: true,  body: "Perfect — let's start with two sessions next week.", mins: 60 * 25 },
        ];
      default:
        return [
          { fromMe: true,  body: "Is the MacBook still for sale?", mins: 60 * 120 },
          { fromMe: false, body: "Yes, would you like to come check it tomorrow?", mins: 60 * 118 },
          { fromMe: true,  body: "Sounds good, I'll bring cash.", mins: 60 * 96 },
        ];
    }
  })();

  return base.map((m, i) => ({
    id: `${convId}-msg-${i}`,
    conversation_id: convId,
    sender_id: m.fromMe
      ? DEMO_ME.id
      : DEMO_CONVERSATIONS.find((c) => c.id === convId)!.peer.id,
    body: m.body,
    created_at: new Date(now.getTime() - m.mins * 60_000).toISOString(),
  }));
}

// ---------------------------------------------------------------------
// ADMIN ANALYTICS
// ---------------------------------------------------------------------
export function demoAnalyticsSeries() {
  const series: { day: string; users: number; listings: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    series.push({
      day: d.toISOString().slice(5, 10),
      users: Math.round(3 + Math.random() * 9),
      listings: Math.round(5 + Math.random() * 12),
    });
  }
  return series;
}

export const DEMO_REPORTS = [
  {
    id: "rep-1",
    reporter_id: DEMO_SELLERS[0].id,
    listing_id: "listing-8",
    target_user_id: null,
    reason: "Suspicious pricing / scam",
    details: "Price seems too low for a PS5 in this condition.",
    status: "open" as const,
    created_at: daysAgo(1),
    reporter: { full_name: DEMO_SELLERS[0].full_name, email: DEMO_SELLERS[0].email },
    listing: { id: "listing-8", title: "PlayStation 5 + 2 controllers" },
  },
  {
    id: "rep-2",
    reporter_id: DEMO_SELLERS[2].id,
    listing_id: "listing-2",
    target_user_id: null,
    reason: "Wrong category",
    details: null,
    status: "reviewing" as const,
    created_at: daysAgo(3),
    reporter: { full_name: DEMO_SELLERS[2].full_name, email: DEMO_SELLERS[2].email },
    listing: { id: "listing-2", title: "iPhone 15 Pro Max 256GB" },
  },
];
