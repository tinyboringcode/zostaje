export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, color, emoji, type } = body;

  const category = await prisma.category.update({
    where: { id: params.id },
    data: { name, color, emoji, type },
  });

  return NextResponse.json(category);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  // Soft delete: archive instead of hard delete (may have transactions)
  await prisma.category.update({
    where: { id: params.id },
    data: { isArchived: true },
  });
  return new NextResponse(null, { status: 204 });
}
