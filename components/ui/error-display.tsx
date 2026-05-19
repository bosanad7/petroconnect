"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
  home?: string;
}

export function ErrorDisplay({
  title = "Something went wrong",
  description = "We couldn't load this page. The error has been logged.",
  error,
  reset,
  home = "/marketplace",
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[60vh] flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full rounded-3xl glass-strong p-8 text-center space-y-5 relative overflow-hidden">
        <div className="absolute inset-0 mesh-backdrop opacity-50 pointer-events-none" />
        <div className="relative">
          <div className="mx-auto size-14 rounded-2xl grid place-items-center bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            {description}
          </p>
          {error?.digest && (
            <p className="mt-3 inline-block px-2 py-1 rounded-md bg-muted border border-border text-[10px] font-mono text-muted-foreground">
              ref: {error.digest}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-2">
            {reset && (
              <Button onClick={reset} variant="default">
                <RotateCcw className="size-4" />
                Try again
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={home}>Go home</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
