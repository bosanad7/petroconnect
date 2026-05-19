"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl bg-card border border-border shadow-sm",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 mesh-backdrop opacity-50" />

      <div className="relative z-10 flex flex-col items-center">
        {icon && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative mb-5"
          >
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative size-16 rounded-2xl grid place-items-center bg-primary-soft text-primary border border-orange-100">
              {icon}
            </div>
          </motion.div>
        )}
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-sm text-pretty">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </motion.div>
  );
}
