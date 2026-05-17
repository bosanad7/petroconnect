"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ReportStatus } from "@/types/database";

interface Props {
  reportId: string;
  listingId: string | null;
  currentStatus: ReportStatus;
}

export function ReportActions({ reportId, listingId, currentStatus }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();

  function setStatus(status: ReportStatus) {
    startTransition(async () => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", reportId);
      if (error) {
        toast.error("Could not update");
        return;
      }
      toast.success(`Marked ${status}`);
      router.refresh();
    });
  }

  async function removeListing() {
    if (!listingId) return;
    startTransition(async () => {
      const { error } = await supabase
        .from("listings")
        .update({ status: "removed" })
        .eq("id", listingId);
      if (error) {
        toast.error("Could not remove listing");
        return;
      }
      await supabase
        .from("reports")
        .update({ status: "resolved" })
        .eq("id", reportId);
      toast.success("Listing removed");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus !== "reviewing" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStatus("reviewing")}
          disabled={pending}
        >
          Mark reviewing
        </Button>
      )}
      {currentStatus !== "dismissed" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStatus("dismissed")}
          disabled={pending}
        >
          Dismiss
        </Button>
      )}
      {currentStatus !== "resolved" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setStatus("resolved")}
          disabled={pending}
        >
          Resolve
        </Button>
      )}
      {listingId && (
        <Button
          variant="destructive"
          size="sm"
          onClick={removeListing}
          disabled={pending}
        >
          Remove listing
        </Button>
      )}
    </div>
  );
}
