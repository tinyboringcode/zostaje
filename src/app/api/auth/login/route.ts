export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword || password !== appPassword) {
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth-token", appPassword, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
