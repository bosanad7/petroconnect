// Generated-style typed handles for our schema. Keep in sync with
// /supabase/schema.sql. (For production: run `supabase gen types typescript`.)

export type KCompany =
  | "KPC" | "KOC" | "KNPC" | "KIPIC" | "PIC" | "KGOC"
  | "KUFPEC" | "KOTC" | "KAFCO" | "Q8" | "OTHER";

export type ListingKind = "product" | "service" | "service_request";
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "for_parts";
export type ListingStatus = "draft" | "active" | "paused" | "sold" | "removed";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type UserRole = "member" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  company: KCompany | null;
  department: string | null;
  job_title: string | null;
  bio: string | null;
  is_verified: boolean;
  role: UserRole;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  kind: ListingKind;
  icon: string | null;
  sort_order: number;
}

export interface Listing {
  id: string;
  seller_id: string;
  kind: ListingKind;
  title: string;
  description: string;
  category_id: string | null;
  condition: ListingCondition | null;
  price_kwd: number | null;
  is_negotiable: boolean;
  location: string | null;
  images: string[];
  status: ListingStatus;
  is_featured: boolean;
  views: number;
  ai_score: number | null;
  ai_flags: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ListingWithSeller extends Listing {
  seller: Profile;
  category: Category | null;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  listing_id: string | null;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface AIRecommendation {
  id: string;
  user_id: string;
  listing_id: string;
  score: number;
  reason: string | null;
  created_at: string;
}
