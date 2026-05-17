"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";
import type { Profile } from "@/types/database";

export function Topbar({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSearch(formData: FormData) {
    const q = formData.get("q")?.toString().trim();
    if (!q) return;
    router.push(`/marketplace?q=${encodeURIComponent(q)}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-8 py-3 glass border-b border-white/5">
      <form action={handleSearch} className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Search products, services, sellers…"
          className="pl-9 h-10"
        />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="ring-focus rounded-full">
            <Avatar className="size-9">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-3 py-3">
              <p className="text-sm font-medium truncate">
                {profile.full_name ?? profile.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {profile.company && (
                  <Badge variant="outline" className="text-[10px]">
                    {profile.company}
                  </Badge>
                )}
                {profile.is_verified && (
                  <Badge variant="success" className="text-[10px]">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/profile/${profile.id}`}>My profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/saved">Saved items</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/create">Post listing</Link>
            </DropdownMenuItem>
            {profile.role === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin dashboard</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-400">
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
