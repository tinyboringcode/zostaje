export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const locked = await prisma.lockedMonth.findMany({ orderBy: { month: "desc" } });
  return NextResponse.json(locked);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { month, note, action } = body;

  if (!month) return NextResponse.json({ error: "Brak pola month (YYYY-MM)" }, { status: 400 });

  if (action === "unlock") {
    await prisma.lockedMonth.deleteMany({ where: { month } });
    return NextResponse.json({ ok: true, unlocked: month });
  }

  // Sprawdź czy są transakcje w tym miesiącu
  const [y, m] = month.split("-");
  const from = new Date(Number(y), Number(m) - 1, 1);
  const to = new Date(Number(y), Number(m), 1);
  const txCount = await prisma.transaction.count({
    where: { date: { gte: from, lt: to } },
  });

  const locked = await prisma.lockedMonth.upsert({
    where: { month },
    update: { lockedAt: new Date(), note: note ?? "" },
    create: { month, note: note ?? "" },
  });

  return NextResponse.json({ ...locked, txCount });
}
