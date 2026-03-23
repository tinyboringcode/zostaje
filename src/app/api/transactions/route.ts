export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { learnFromTransaction } from "@/lib/categorizer";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") ?? "date";
  const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { description: { contains: search } },
      { contractor: { contains: search } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

// DELETE /api/transactions — bulk delete
// body: { scope: "filtered" | "all", from?: string, to?: string, type?: string, categoryId?: string }
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { scope, from, to, type, categoryId } = body as {
    scope: "filtered" | "all";
    from?: string;
    to?: string;
    type?: string;
    categoryId?: string;
  };

  const where: Record<string, unknown> = {};

  if (scope === "filtered") {
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) {
        // Include full last day
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (where.date as Record<string, unknown>).lte = toDate;
      }
    }
  }
  // scope === "all" → where stays empty → deletes everything

  const { count } = await prisma.transaction.deleteMany({ where });
  return NextResponse.json({ deleted: count });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, date, description, contractor, type, categoryId, contractorId, invoiceId } = body;

  if (!amount || !date || !description || !type || !categoryId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      amount: parseFloat(amount),
      date: new Date(date),
      description,
      contractor: contractor || null,
      type,
      categoryId,
      contractorId: contractorId || null,
      invoiceId: invoiceId || null,
    },
    include: { category: true, contractorRel: { select: { id: true, name: true } } },
  });

  // If linked to an invoice, mark it as paid
  if (invoiceId) {
    await prisma.contractorInvoice.update({
      where: { id: invoiceId },
      data: { status: "paid", paidAt: new Date(date) },
    });
  }

  // Fire-and-forget learning — don't block the response
  learnFromTransaction(description, categoryId, type).catch(() => {});

  return NextResponse.json(transaction, { status: 201 });
}
