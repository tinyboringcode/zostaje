export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { resolveUserId } from "@/server/session";

export async function GET(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const categories = await prisma.category.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const resolved = await resolveUserId(req);
  if (resolved instanceof NextResponse) return resolved;
  const { userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const { name, color, emoji, type } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { userId, name, color: color ?? "#6366f1", emoji: emoji ?? "📁", type },
  });

  return NextResponse.json(category, { status: 201 });
}
