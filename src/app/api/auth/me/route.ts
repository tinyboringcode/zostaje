export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Returns the current user's plan. For now this is driven by an env
 * variable (`PLAN=pro` or `PLAN=free`). In a real multi-tenant setup
 * this would read from the user record on the session.
 */
export async function GET(_req: NextRequest) {
  const plan = process.env.PLAN === "pro" ? "pro" : "free";
  return NextResponse.json({ plan });
}
