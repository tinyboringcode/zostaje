import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDisclosure } from "@/lib/disclosure";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await prisma.transaction.count();

  let oldestDays = 0;
  if (count > 0) {
    const oldest = await prisma.transaction.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    });
    if (oldest) {
      oldestDays = Math.floor(
        (Date.now() - oldest.date.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const state = computeDisclosure(count, oldestDays);

  return NextResponse.json({
    txCount: state.txCount,
    oldestDays: state.oldestDays,
    unlocked: Array.from(state.unlocked),
    locked: state.locked,
    nextUnlock: state.nextUnlock,
    progressPct: state.progressPct,
  });
}
