"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[auth]", error);
  }, [error]);

  return (
    <ErrorDisplay
      title="Authentication error"
      description="We couldn't complete that auth step. Try again or contact support."
      error={error}
      reset={reset}
      home="/"
    />
  );
}
