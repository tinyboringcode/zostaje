export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  const where = month ? { month } : {};

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });

  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { categoryId, month, limitAmount } = body;

  if (!categoryId || !month || !limitAmount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { categoryId_month: { categoryId, month } },
    update: { limitAmount: parseFloat(limitAmount) },
    create: { categoryId, month, limitAmount: parseFloat(limitAmount) },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
