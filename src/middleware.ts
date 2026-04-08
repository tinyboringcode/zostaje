import { NextRequest, NextResponse } from "next/server";

const ALWAYS_PUBLIC = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/health",
  "/_next",
  "/favicon.ico",
  "/auth",
  "/",
  "/m",
  "/download",
  "/pricing",
  "/account",
  "/onboarding",
  "/landing",
  "/sync",
];

function isPublic(pathname: string): boolean {
  return ALWAYS_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );
}

function isMobile(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function isElectron(ua: string): boolean {
  return ua.includes("Electron/");
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

/**
 * Verify HMAC-SHA256 session token using Web Crypto (Edge-compatible).
 * Token format: base64url(payload).base64url(sig)
 */
async function verifySessionCookie(token: string): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sigStr = token.slice(dot + 1);

  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-change-in-production";

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode base64url → bytes
    const b64 = sigStr.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const sigBytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));

    return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return withSecurityHeaders(NextResponse.next());
  }

  const ua = req.headers.get("user-agent") ?? "";

  // Mobile redirect from root
  if (!pathname.startsWith("/m") && !pathname.startsWith("/api") && isMobile(ua) && pathname === "/") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/m/", req.url)));
  }

  // Desktop (Electron): vault handles its own auth — skip web auth entirely
  if (isElectron(ua)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Public paths need no auth
  if (isPublic(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Protected routes: verify session cookie
  const sessionToken = req.cookies.get("session")?.value;
  const valid = sessionToken ? await verifySessionCookie(sessionToken) : false;

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json({ error: "Nie zalogowano" }, { status: 401 }));
    }
    return withSecurityHeaders(NextResponse.redirect(new URL("/auth", req.url)));
  }

  // Onboarding check (page routes only)
  if (!pathname.startsWith("/api") && !pathname.startsWith("/onboarding")) {
    const onboardingCookie = req.cookies.get("onboarding-completed")?.value;
    if (onboardingCookie !== "1") {
      try {
        const res = await fetch(new URL("/api/settings", req.url), {
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });
        if (res.ok) {
          const settings = await res.json();
          if (!settings.onboardingCompleted) {
            return withSecurityHeaders(NextResponse.redirect(new URL("/onboarding", req.url)));
          }
          const response = NextResponse.next();
          response.cookies.set("onboarding-completed", "1", { path: "/", httpOnly: true });
          return withSecurityHeaders(response);
        }
      } catch {
        // Allow through if DB unavailable
      }
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
