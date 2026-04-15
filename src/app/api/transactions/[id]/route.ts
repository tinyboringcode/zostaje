export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!tx || tx.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tx);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const { amount, date, description, contractor, type, categoryId, contractorId, invoiceId } = body;

  // Get old transaction to handle invoice link changes — verify ownership simultaneously
  const old = await prisma.transaction.findUnique({
    where: { id: params.id },
    select: { invoiceId: true, userId: true },
  });
  if (!old || old.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If invoice link is being removed, revert it back to pending
  if (old.invoiceId && old.invoiceId !== invoiceId) {
    await prisma.contractorInvoice.update({
      where: { id: old.invoiceId },
      data: { status: "pending", paidAt: null },
    });
  }

  const tx = await prisma.transaction.update({
    where: { id: params.id },
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

  // If new invoice linked, mark it as paid
  if (invoiceId && invoiceId !== old.invoiceId) {
    await prisma.contractorInvoice.update({
      where: { id: invoiceId },
      data: { status: "paid", paidAt: new Date(date) },
    });
  }

  return NextResponse.json(tx);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.transaction.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
