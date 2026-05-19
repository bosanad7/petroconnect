"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { KCompany } from "@/types/database";

interface Props {
  company?: KCompany | null;
  className?: string;
  size?: "sm" | "md";
  withLabel?: boolean;
}

export function VerifiedBadge({
  company,
  className,
  size = "sm",
  withLabel = false,
}: Props) {
  const iconCls = size === "md" ? "size-4" : "size-3.5";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Verified K-Company employee"
          className={cn(
            "inline-flex items-center gap-1 align-middle text-blue-600 hover:text-blue-700 transition-colors ring-focus rounded",
            withLabel &&
              "px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100",
            className,
          )}
        >
          <BadgeCheck className={iconCls} />
          {withLabel && (
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Verified
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={6}
          className="z-50 w-64 rounded-xl bg-card border border-border shadow-lg p-4 text-xs space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <div className="flex items-center gap-2">
            <span className="size-7 grid place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="size-3.5" />
            </span>
            <p className="font-medium text-foreground">Verified employee</p>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            This member's email has been confirmed against
            {company ? (
              <>
                {" "}
                the <span className="text-foreground font-medium">{company}</span> corporate domain.
              </>
            ) : (
              " a K-Company corporate domain."
            )}{" "}
            PetroConnect is closed to the public — only current employees can
            register.
          </p>
          <a
            href="/trust"
            className="inline-flex items-center text-primary hover:underline text-[11px]"
          >
            How verification works →
          </a>
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
