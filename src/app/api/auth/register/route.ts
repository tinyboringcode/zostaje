export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { hashPassword, createSessionToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Podaj email i hasło" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Hasło musi mieć minimum 8 znaków" }, { status: 400 });
  }
  const emailClean = String(email).toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return NextResponse.json({ error: "Nieprawidłowy format email" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: emailClean } });
  if (existing) {
    return NextResponse.json({ error: "Konto z tym adresem już istnieje" }, { status: 409 });
  }

  const hashed = hashPassword(String(password));
  const user = await prisma.user.create({
    data: { email: emailClean, password: hashed, plan: "free" },
  });

  const token = createSessionToken(user.id);
  const res = NextResponse.json({ ok: true, plan: user.plan });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
