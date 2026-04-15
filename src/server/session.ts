import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "./auth";

/**
 * Resolves the userId for a request.
 *
 * Resolution order:
 *   1. Valid session cookie  → authenticated user's id
 *   2. Electron UA bypass    → "default"   (desktop runs locally, no web auth)
 *   3. No session            → "default"   (backward-compat for existing single-user data)
 *
 * Returns `{ userId }` on success, or a 401 `NextResponse` when the session
 * cookie is present but invalid/expired (tampered token).
 */
export async function resolveUserId(
  req: NextRequest
): Promise<{ userId: string } | NextResponse> {
  // Electron desktop bypasses web auth entirely — vault is the only gate
  const ua = req.headers.get("user-agent") ?? "";
  if (ua.includes("Electron")) {
    return { userId: "default" };
  }

  const token = req.cookies.get("session")?.value;

  // No cookie at all → fall back to "default" (legacy single-user mode)
  if (!token) {
    return { userId: "default" };
  }

  // Cookie present → must be valid
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: user.id };
}

/**
 * Strict variant: always requires a valid session.
 * Use this when you want to enforce authentication (e.g. Pro-only endpoints).
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const ua = req.headers.get("user-agent") ?? "";
  if (ua.includes("Electron")) {
    return { userId: "default" };
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: user.id };
}
