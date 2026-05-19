"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorDisplay error={error} reset={reset} home="/" />;
}
