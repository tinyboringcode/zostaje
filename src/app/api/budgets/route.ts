export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function GET(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  const where = month ? { userId, month } : { userId };

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });

  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const { categoryId, month, limitAmount } = body;

  if (!categoryId || !month || !limitAmount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId, categoryId, month } },
    update: { limitAmount: parseFloat(limitAmount) },
    create: { userId, categoryId, month, limitAmount: parseFloat(limitAmount) },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
