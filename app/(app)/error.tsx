"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <ErrorDisplay
      title="We hit a snag"
      description="The page failed to load. Try again or head back to the marketplace."
      error={error}
      reset={reset}
    />
  );
}
