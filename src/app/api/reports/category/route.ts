export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: Record<string, Date> = {};
  if (year) {
    dateFilter.gte = new Date(`${year}-01-01`);
    dateFilter.lte = new Date(`${year}-12-31T23:59:59`);
  } else if (from || to) {
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
  }

  const transactions = await prisma.transaction.findMany({
    where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
    include: { category: true },
  });

  const result: Record<
    string,
    { categoryId: string; name: string; color: string; emoji: string; type: string; total: number }
  > = {};

  for (const tx of transactions) {
    const key = tx.category.id;
    if (!result[key]) {
      result[key] = {
        categoryId: key,
        name: tx.category.name,
        color: tx.category.color,
        emoji: tx.category.emoji,
        type: tx.category.type,
        total: 0,
      };
    }
    result[key].total += tx.amount;
  }

  return NextResponse.json(Object.values(result).sort((a, b) => b.total - a.total));
}
