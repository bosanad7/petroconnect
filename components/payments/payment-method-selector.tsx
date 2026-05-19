"use client";

import * as React from "react";
import { CreditCard, Smartphone, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PaymentProvider } from "@/types/database";

interface Option {
  id: PaymentProvider;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const OPTIONS: Option[] = [
  { id: "mock",       label: "Demo (instant confirm)", sub: "For testing — no real charge",  icon: Zap,        enabled: true },
  { id: "knet",       label: "KNET",                   sub: "Kuwait national debit network", icon: CreditCard, enabled: false },
  { id: "myfatoorah", label: "MyFatoorah",             sub: "Cards, Apple Pay, GooglePay",   icon: Wallet,     enabled: false },
  { id: "tap",        label: "Tap Payments",           sub: "Cards · debit · Apple Pay",     icon: Smartphone, enabled: false },
];

export function PaymentMethodSelector({
  value,
  onChange,
  className,
}: {
  value: PaymentProvider;
  onChange: (v: PaymentProvider) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Payment method
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const selected = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={!o.enabled}
              onClick={() => o.enabled && onChange(o.id)}
              className={cn(
                "relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                selected
                  ? "border-primary bg-primary/[0.06] shadow-sm"
                  : "border-border bg-card hover:bg-muted/60",
                !o.enabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "size-9 grid place-items-center rounded-lg shrink-0",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{o.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {o.sub}
                </p>
              </div>
              {!o.enabled && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border bg-muted rounded-md px-1.5 py-0.5">
                  Coming
                </span>
              )}
              {selected && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
