// Database type used by the Supabase clients to give us end-to-end
// type safety without running `supabase gen types` in CI. Keep in sync
// with /supabase/schema.sql — for prod, run `supabase gen types typescript`
// and replace this file.

import type {
  AIRecommendation,
  Category,
  Conversation,
  ConversationParticipant,
  KCompany,
  Listing,
  ListingCondition,
  ListingKind,
  ListingStatus,
  Message,
  Notification,
  Payment,
  PaymentEvent,
  PaymentProvider,
  PaymentStatus,
  Profile,
  Report,
  ReportStatus,
  Transaction,
  UserRole,
} from "./database";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type InsertOf<T, Required extends keyof T = never> = Partial<
  Omit<T, "id" | "created_at" | "updated_at">
> &
  Pick<T, Required & keyof T>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: InsertOf<Profile, "id" | "email">;
        Update: Partial<Profile>;
      };
      categories: {
        Row: Category;
        Insert: InsertOf<Category, "slug" | "name" | "kind">;
        Update: Partial<Category>;
      };
      listings: {
        Row: Listing;
        Insert: InsertOf<Listing, "seller_id" | "title" | "description"> & {
          ai_flags?: Json | null;
        };
        Update: Partial<Listing> & { ai_flags?: Json | null };
      };
      favorites: {
        Row: { user_id: string; listing_id: string; created_at: string };
        Insert: { user_id: string; listing_id: string };
        Update: never;
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation>;
        Update: Partial<Conversation>;
      };
      conversation_participants: {
        Row: ConversationParticipant;
        Insert: { conversation_id: string; user_id: string; last_read_at?: string | null };
        Update: { last_read_at?: string | null };
      };
      messages: {
        Row: Message;
        Insert: { conversation_id: string; sender_id: string; body: string };
        Update: never;
      };
      reports: {
        Row: Report;
        Insert: InsertOf<Report, "reporter_id" | "reason">;
        Update: Partial<Report>;
      };
      notifications: {
        Row: Notification;
        Insert: InsertOf<Notification, "user_id" | "type" | "title"> & {
          data?: Json | null;
        };
        Update: Partial<Notification> & { data?: Json | null };
      };
      ai_recommendations: {
        Row: AIRecommendation;
        Insert: InsertOf<AIRecommendation, "user_id" | "listing_id" | "score">;
        Update: Partial<AIRecommendation>;
      };
      payments: {
        Row: Payment;
        Insert: InsertOf<Payment, "listing_id" | "buyer_id" | "seller_id" | "amount"> & {
          metadata?: Json | null;
        };
        Update: Partial<Payment> & { metadata?: Json | null };
      };
      payment_events: {
        Row: PaymentEvent;
        Insert: { payment_id: string; event_type: string; payload?: Json | null };
        Update: never;
      };
      transactions: {
        Row: Transaction;
        Insert: InsertOf<Transaction, "payment_id" | "listing_id" | "buyer_id" | "seller_id" | "amount" | "total">;
        Update: Partial<Transaction>;
      };
      platform_fees: {
        Row: {
          id: string;
          name: string;
          min_amount: number;
          max_amount: number | null;
          percent: number;
          flat_fee: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          min_amount?: number;
          max_amount?: number | null;
          percent?: number;
          flat_fee?: number;
          active?: boolean;
        };
        Update: Partial<{
          name: string;
          min_amount: number;
          max_amount: number | null;
          percent: number;
          flat_fee: number;
          active: boolean;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      increment_listing_views: {
        Args: { p_listing: string };
        Returns: number;
      };
      start_conversation: {
        Args: { p_listing: string | null; p_peer: string };
        Returns: string;
      };
      mark_listing_sold: {
        Args: { p_listing: string; p_buyer: string };
        Returns: undefined;
      };
      mark_listing_reserved: {
        Args: { p_listing: string; p_buyer: string };
        Returns: undefined;
      };
      leave_review: {
        Args: { p_listing: string; p_rating: number; p_body?: string | null };
        Returns: string;
      };
      compute_fee: { Args: { p_amount: number }; Returns: number };
      create_payment: {
        Args: { p_listing: string; p_provider?: PaymentProvider };
        Returns: string;
      };
      confirm_payment: {
        Args: {
          p_payment: string;
          p_provider_payment_id: string;
          p_success: boolean;
        };
        Returns: undefined;
      };
    };
    Enums: {
      k_company: KCompany;
      listing_kind: ListingKind;
      listing_condition: ListingCondition;
      listing_status: ListingStatus;
      report_status: ReportStatus;
      user_role: UserRole;
      payment_provider: PaymentProvider;
      payment_status: PaymentStatus;
    };
  };
}
