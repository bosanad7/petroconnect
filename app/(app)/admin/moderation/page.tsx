import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ShieldAlert } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { ModerationSubnav } from "@/components/admin/moderation-subnav";

export const dynamic = "force-dynamic";

interface FlaggedRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  flagged_at: string;
  moderation_severity: number | null;
  moderation_categories: string[] | null;
  moderation_rationale: string | null;
  created_at: string;
  sender: { full_name: string | null; email: string; company: string | null } | null;
}

export default async function AdminModerationPage() {
  await requireAdmin();

  // Admin needs to see flagged messages across all conversations. RLS
  // for messages currently only allows participants, so we go through
  // the service-role client. (Admins can also read via is_admin() in
  // the policy, but flagged messages are sensitive enough to centralise
  // the fetch here.)
  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("messages")
    .select(
      `id, conversation_id, sender_id, body, flagged_at,
       moderation_severity, moderation_categories, moderation_rationale,
       created_at,
       sender:profiles!sender_id(full_name, email, company)`,
    )
    .not("flagged_at", "is", null)
    .order("flagged_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <p className="text-sm text-rose-600">
        Could not load flagged messages: {error.message}
      </p>
    );
  }

  const rows = (data ?? []) as unknown as FlaggedRow[];

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <ModerationSubnav />
        <EmptyState
          icon={<ShieldAlert className="size-5" />}
          title="No flagged messages"
          description="The AI moderator scans every chat message after send. Anything risky shows up here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ModerationSubnav />
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Flagged messages</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} flagged · ordered by most recent
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {rows.map((r) => {
          const sev = Number(r.moderation_severity ?? 0);
          const tone =
            sev >= 0.85
              ? "danger"
              : sev >= 0.65
              ? "warning"
              : "secondary";
          return (
            <Card key={r.id}>
              <CardContent className="p-5 flex flex-col lg:flex-row gap-4 lg:items-start">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={tone as "danger" | "warning" | "secondary"}>
                      Severity {(sev * 100).toFixed(0)}%
                    </Badge>
                    {(r.moderation_categories ?? []).map((c) => (
                      <span
                        key={c}
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground"
                      >
                        {c.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm whitespace-pre-wrap break-words border-l-2 border-rose-200 pl-3 italic text-foreground/90">
                    &ldquo;{r.body}&rdquo;
                  </p>

                  {r.moderation_rationale && (
                    <p className="text-[11px] text-muted-foreground">
                      AI rationale: {r.moderation_rationale}
                    </p>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    From{" "}
                    <Link
                      href={`/profile/${r.sender_id}`}
                      className="text-foreground/90 hover:underline"
                    >
                      {r.sender?.full_name ?? r.sender?.email}
                    </Link>
                    {r.sender?.company && <> · {r.sender.company}</>}
                    {" · "}flagged {formatRelative(r.flagged_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/chat/${r.conversation_id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <MessageSquare className="size-3" /> Open chat
                  </Link>
                  <ModerationActions messageId={r.id} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
