/** @type {import('next').NextConfig} */

// Build a Content-Security-Policy that allows what we actually need
// (Supabase REST + websocket, our image hosts, inline styles for Next)
// and blocks everything else.
const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseWS = supabaseHost ? `wss://${supabaseHost}` : "";

const csp = [
  `default-src 'self'`,
  // Next + Recharts inject inline styles; allow them. Scripts stay tight.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://api.dicebear.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWS} https://openrouter.ai`,
  `media-src 'self' blob: https://*.supabase.co`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  typedRoutes: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
