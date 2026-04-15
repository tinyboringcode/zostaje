export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const contractor = await prisma.contractor.findUnique({
    where: { id: params.id },
    include: {
      invoices: { orderBy: { issueDate: "desc" } },
    },
  });
  if (!contractor || contractor.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(contractor);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.contractor.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const contractor = await prisma.contractor.update({
    where: { id: params.id },
    data: {
      name: body.name,
      companyType: body.companyType ?? "other",
      nip: body.nip ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      phonePrefix: body.phonePrefix ?? "+48",
      addressStreet: body.addressStreet ?? "",
      addressCity: body.addressCity ?? "",
      addressPostal: body.addressPostal ?? "",
      addressCountry: body.addressCountry ?? "PL",
      address: body.address ?? "",
      notes: body.notes ?? "",
    },
  });
  return NextResponse.json(contractor);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.contractor.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.contractor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
