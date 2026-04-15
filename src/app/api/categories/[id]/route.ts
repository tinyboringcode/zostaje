export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, color, emoji, type } = body;

  const category = await prisma.category.update({
    where: { id: params.id },
    data: { name, color, emoji, type },
  });

  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft delete: archive instead of hard delete (may have transactions)
  await prisma.category.update({
    where: { id: params.id },
    data: { isArchived: true },
  });
  return new NextResponse(null, { status: 204 });
}
