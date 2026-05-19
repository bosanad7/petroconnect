"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Loader2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_DOMAINS, detectCompany } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const detected = useMemo(() => detectCompany(email), [email]);
  const domainOk = useMemo(() => {
    if (!email.includes("@")) return null;
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    return ALLOWED_DOMAINS.some((d) => domain.endsWith(d));
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (domainOk === false) {
      toast.error("Use a verified K-Company email address");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/marketplace`,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — check your email to verify");
    router.replace("/login");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Verified K-Company employees only.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="Mohammed Al-Sabah"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@kpc.com.kw"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {email.includes("@") && (
            <div className="flex items-center gap-2 text-xs">
              {domainOk ? (
                <Badge variant="success">
                  <BadgeCheck className="size-3" />
                  Verified domain · {detected}
                </Badge>
              ) : (
                <Badge variant="danger">
                  <ShieldAlert className="size-3" />
                  Domain not recognized
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Minimum 8 characters.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading || domainOk === false}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center">
        Already a member?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <div className="rounded-xl glass p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">
          Accepted email domains
        </p>
        <p className="leading-relaxed">{ALLOWED_DOMAINS.join(" · ")}</p>
      </div>
    </div>
  );
}
