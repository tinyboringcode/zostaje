export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contractor = await prisma.contractor.findUnique({
    where: { id: params.id },
    include: {
      invoices: { orderBy: { issueDate: "desc" } },
    },
  });
  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contractor);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contractor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
