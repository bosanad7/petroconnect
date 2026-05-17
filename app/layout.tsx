import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PetroConnect — Trusted marketplace for Kuwait's oil sector",
    template: "%s · PetroConnect",
  },
  description:
    "A secure, employee-only marketplace exclusively for verified employees of Kuwait's K-Companies.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "PetroConnect",
    description:
      "A secure, employee-only marketplace for Kuwait's K-Companies.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070f1f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: "glass-strong !text-foreground !border-white/10",
          }}
        />
      </body>
    </html>
  );
}
