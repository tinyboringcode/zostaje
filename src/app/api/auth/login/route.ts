export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyPassword, createSessionToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Podaj email i hasło" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !verifyPassword(String(password), user.password)) {
    return NextResponse.json({ error: "Nieprawidłowy email lub hasło" }, { status: 401 });
  }

  const token = createSessionToken(user.id);
  const res = NextResponse.json({ ok: true, plan: user.plan });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === "production",
  });
  // Remove legacy cookie
  res.cookies.delete("auth-token");
  return res;
}
