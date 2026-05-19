import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ALL_DEMO_PROFILES, isDemoMode } from "@/lib/demo/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { initials, formatRelative } from "@/lib/utils/format";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();

  let users: Profile[];
  if (isDemoMode()) {
    users = ALL_DEMO_PROFILES;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    users = (data ?? []) as Profile[];
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">
          Latest 100 registered employees.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Verified</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">{u.company ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={u.role === "admin" ? "warning" : "outline"}
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {u.is_verified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatRelative(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
