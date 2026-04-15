export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function GET(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const locked = await prisma.lockedMonth.findMany({
    where: { userId },
    orderBy: { month: "desc" },
  });
  return NextResponse.json(locked);
}

export async function POST(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const { month, note, action } = body;

  if (!month) return NextResponse.json({ error: "Brak pola month (YYYY-MM)" }, { status: 400 });

  if (action === "unlock") {
    await prisma.lockedMonth.deleteMany({ where: { userId, month } });
    return NextResponse.json({ ok: true, unlocked: month });
  }

  // Sprawdź czy są transakcje w tym miesiącu (dla tego użytkownika)
  const [y, m] = month.split("-");
  const from = new Date(Number(y), Number(m) - 1, 1);
  const to = new Date(Number(y), Number(m), 1);
  const txCount = await prisma.transaction.count({
    where: { userId, date: { gte: from, lt: to } },
  });

  const locked = await prisma.lockedMonth.upsert({
    where: { userId_month: { userId, month } },
    update: { lockedAt: new Date(), note: note ?? "" },
    create: { userId, month, note: note ?? "" },
  });

  return NextResponse.json({ ...locked, txCount });
}
