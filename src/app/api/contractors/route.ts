export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function GET(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const contractors = await prisma.contractor.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      invoices: {
        select: { id: true, number: true, amount: true, status: true, dueDate: true, issueDate: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  const enriched = contractors.map((c) => {
    const total = c.invoices.reduce((s, i) => s + i.amount, 0);
    const unpaid = c.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
    const overdue = c.invoices.filter((i) => i.status === "overdue").length;
    return { ...c, totalAmount: total, unpaidAmount: unpaid, overdueCount: overdue };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const contractor = await prisma.contractor.create({
    data: {
      userId,
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
  return NextResponse.json(contractor, { status: 201 });
}
