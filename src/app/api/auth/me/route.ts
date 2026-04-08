export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";

export async function GET(req: NextRequest) {
  // Desktop (Electron): plan is driven by PLAN env var, no account needed
  const ua = req.headers.get("user-agent") ?? "";
  if (ua.includes("Electron/")) {
    const plan = process.env.PLAN === "pro" ? "pro" : "free";
    return NextResponse.json({ plan, isDesktop: true });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
  });
}
