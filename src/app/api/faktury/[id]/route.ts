export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

function calcVatAmounts(gross: number, vatRate: number) {
  if (vatRate < 0) return { netAmount: gross, vatAmount: 0 };
  const net = gross / (1 + vatRate / 100);
  const vat = gross - net;
  return { netAmount: Math.round(net * 100) / 100, vatAmount: Math.round(vat * 100) / 100 };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const invoice = await prisma.contractorInvoice.findUnique({
    where: { id: params.id },
    include: {
      contractor: true,
      transaction: { include: { category: true } },
    },
  });
  if (!invoice || invoice.userId !== userId) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.contractorInvoice.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { amount, dueDate, issueDate, vatRate, description, currency, notes, status, template } = body;

  const updates: Record<string, unknown> = {};
  if (amount !== undefined) {
    const gross = Number(amount);
    const rate = vatRate !== undefined ? Number(vatRate) : 23;
    const { netAmount, vatAmount } = calcVatAmounts(gross, rate);
    updates.amount = gross;
    updates.netAmount = netAmount;
    updates.vatAmount = vatAmount;
    updates.vatRate = rate;
  }
  if (dueDate) updates.dueDate = new Date(dueDate);
  if (issueDate) updates.issueDate = new Date(issueDate);
  if (description !== undefined) updates.description = description;
  if (currency) updates.currency = currency;
  if (notes !== undefined) updates.notes = notes;
  if (template) updates.template = template;
  if (status) {
    updates.status = status;
    if (status === "paid") updates.paidAt = new Date();
  }

  const invoice = await prisma.contractorInvoice.update({
    where: { id: params.id },
    data: updates,
    include: { contractor: { select: { id: true, name: true, nip: true } } },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.contractorInvoice.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  await prisma.contractorInvoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
