export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const budget = await prisma.budget.update({
    where: { id: params.id },
    data: { limitAmount: parseFloat(body.limitAmount) },
    include: { category: true },
  });
  return NextResponse.json(budget);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.budget.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
