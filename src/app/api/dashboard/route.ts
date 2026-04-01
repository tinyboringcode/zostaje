export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const now = new Date();
  const monthStr =
    searchParams.get("month") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [year, month] = monthStr.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // Current month KPIs
  const monthTx = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { amount: true, type: true },
  });

  const income = monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  // Last 12 months cashflow
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const allTx = await prisma.transaction.findMany({
    where: { date: { gte: twelveMonthsAgo } },
    select: { amount: true, type: true, date: true },
  });

  const cashflow: Record<string, { income: number; expense: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    cashflow[key] = { income: 0, expense: 0 };
  }
  for (const tx of allTx) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
    if (!cashflow[key]) continue;
    if (tx.type === "INCOME") cashflow[key].income += tx.amount;
    else cashflow[key].expense += tx.amount;
  }

  // Top 5 expense categories this month
  const expenseTx = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd }, type: "EXPENSE" },
    include: { category: true },
  });

  const byCategory: Record<string, { name: string; color: string; emoji: string; total: number }> = {};
  for (const tx of expenseTx) {
    const id = tx.category.id;
    if (!byCategory[id]) {
      byCategory[id] = { name: tx.category.name, color: tx.category.color, emoji: tx.category.emoji, total: 0 };
    }
    byCategory[id].total += tx.amount;
  }

  const topCategories = Object.values(byCategory)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return NextResponse.json({
    kpi: {
      income,
      expense,
      profit: income - expense,
      transactionCount: monthTx.length,
    },
    cashflow: Object.entries(cashflow).map(([month, data]) => ({ month, ...data })),
    topCategories,
  });
}
