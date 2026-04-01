export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tx);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { amount, date, description, contractor, type, categoryId, contractorId, invoiceId } = body;

  // Get old transaction to handle invoice link changes
  const old = await prisma.transaction.findUnique({ where: { id: params.id }, select: { invoiceId: true } });

  // If invoice link is being removed, revert it back to pending
  if (old?.invoiceId && old.invoiceId !== invoiceId) {
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
  if (invoiceId && invoiceId !== old?.invoiceId) {
    await prisma.contractorInvoice.update({
      where: { id: invoiceId },
      data: { status: "paid", paidAt: new Date(date) },
    });
  }

  return NextResponse.json(tx);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.transaction.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
