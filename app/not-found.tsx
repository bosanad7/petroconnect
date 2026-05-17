import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist or was removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/marketplace">Back to marketplace</Link>
      </Button>
    </div>
  );
}
