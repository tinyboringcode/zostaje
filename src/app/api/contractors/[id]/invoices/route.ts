export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  // Verify the contractor belongs to this user
  const contractor = await prisma.contractor.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!contractor || contractor.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.number || !body.amount || !body.dueDate) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const dueDate = new Date(body.dueDate);
  const status = dueDate < new Date() ? "overdue" : "pending";

  const invoice = await prisma.contractorInvoice.create({
    data: {
      userId,
      contractorId: params.id,
      number: body.number,
      amount: Number(body.amount),
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate,
      status: body.status ?? status,
      notes: body.notes ?? "",
    },
  });
  return NextResponse.json(invoice, { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function PATCH(req: NextRequest, _ctx: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  if (!body.invoiceId) return NextResponse.json({ error: "Brak invoiceId" }, { status: 400 });

  // Verify invoice belongs to this user via contractor
  const existing = await prisma.contractorInvoice.findUnique({
    where: { id: body.invoiceId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark invoice as paid
  const invoice = await prisma.contractorInvoice.update({
    where: { id: body.invoiceId },
    data: {
      status: "paid",
      paidAt: new Date(),
    },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });

  const existing = await prisma.contractorInvoice.findUnique({
    where: { id: invoiceId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.contractorInvoice.delete({ where: { id: invoiceId } });
  return NextResponse.json({ ok: true });
}
