"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { SmartSearch } from "@/components/layout/smart-search";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";
import type { Profile } from "@/types/database";

export function Topbar({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-8 py-3 bg-card/85 backdrop-blur-xl border-b border-border">
      <SmartSearch />

      <div className="ml-auto flex items-center gap-2">
        <NotificationsDropdown userId={profile.id} />

        <DropdownMenu>
          <DropdownMenuTrigger className="ring-focus rounded-full">
            <Avatar className="size-9 ring-1 ring-border">
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
            <DropdownMenuItem onClick={signOut} className="text-red-500">
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
