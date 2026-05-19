import { redirect } from "next/navigation";
import { createClient } from "./server";
import { DEMO_ME, isDemoMode } from "@/lib/demo/data";
import type { Profile } from "@/types/database";

export async function getSession() {
  if (isDemoMode()) return { id: DEMO_ME.id, email: DEMO_ME.email } as const;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  if (isDemoMode()) return DEMO_ME;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/marketplace");
  return profile;
}
