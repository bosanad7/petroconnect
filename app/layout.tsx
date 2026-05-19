import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable}`}
    >
      <body className="font-sans">
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
