import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

const PUBLIC_PATHS = [
  "/",
  "/trust",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/public")) return true;
  if (pathname === "/api/payments/webhook") return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Demo mode bypasses auth entirely — every route loads with mock data.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return response;
  }

  // Fallback when Supabase env isn't configured yet (e.g. first boot before
  // .env.local is filled in) — public pages render, protected pages redirect.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (!isPublic(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          toSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/marketplace";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
