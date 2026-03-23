export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year") ?? new Date().getFullYear().toString();

  const from = new Date(`${year}-01-01`);
  const to = new Date(`${year}-12-31T23:59:59`);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: from, lte: to } },
    select: { amount: true, type: true, date: true },
  });

  // Group by month
  const monthly: Record<string, { income: number; expense: number; profit: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    monthly[key] = { income: 0, expense: 0, profit: 0 };
  }

  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly[key]) continue;
    if (tx.type === "INCOME") monthly[key].income += tx.amount;
    else monthly[key].expense += tx.amount;
  }

  for (const key of Object.keys(monthly)) {
    monthly[key].profit = monthly[key].income - monthly[key].expense;
  }

  return NextResponse.json(monthly);
}
