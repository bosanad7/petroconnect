import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — hero panel */}
      <div className="hidden lg:flex relative flex-col p-10 border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-radial-glow" />
        <Logo />
        <div className="my-auto space-y-6 max-w-md animate-fade-in">
          <h2 className="text-3xl font-semibold tracking-tight">
            A private marketplace for the people who run Kuwait's energy sector.
          </h2>
          <p className="text-muted-foreground">
            Built around verified company emails so every buyer and every seller
            is a colleague — never an anonymous stranger.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" /> Verified
              employee identity
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" /> Encrypted
              in-app messaging
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" /> AI-assisted
              listings & search
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} PetroConnect
        </p>
      </div>

      {/* Right — form */}
      <div className="flex flex-col">
        <div className="lg:hidden p-5">
          <Logo />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="text-center text-xs text-muted-foreground pb-6">
          <Link href="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
