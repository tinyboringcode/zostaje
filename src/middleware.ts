import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/onboarding", "/api/auth/login", "/api/health", "/_next", "/favicon.ico", "/m", "/download", "/pricing", "/sync", "/landing"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isMobile(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Mobile redirect: only from root or main desktop pages, not API or already /m/
  if (!pathname.startsWith("/m") && !pathname.startsWith("/api")) {
    const ua = req.headers.get("user-agent") ?? "";
    if (isMobile(ua) && pathname === "/") {
      return NextResponse.redirect(new URL("/m/", req.url));
    }
  }

  // --- Auth check ---
  const password = process.env.APP_PASSWORD;
  if (password) {
    const cookie = req.cookies.get("auth-token")?.value;
    if (cookie !== password && pathname !== "/login" && pathname !== "/api/auth/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // --- Onboarding check (only for page routes, not API) ---
  if (!pathname.startsWith("/api") && !isPublic(pathname)) {
    const onboardingCookie = req.cookies.get("onboarding-completed")?.value;
    if (onboardingCookie !== "1") {
      // Check DB via internal API (lightweight)
      try {
        const res = await fetch(new URL("/api/settings", req.url), {
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });
        if (res.ok) {
          const settings = await res.json();
          if (!settings.onboardingCompleted) {
            return NextResponse.redirect(new URL("/onboarding", req.url));
          }
          // Set cookie so we don't check DB on every request
          const response = NextResponse.next();
          response.cookies.set("onboarding-completed", "1", { path: "/", httpOnly: true });
          return response;
        }
      } catch {
        // If DB unreachable during first load, allow through
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
