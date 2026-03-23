export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isArchived: false },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, color, emoji, type } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { name, color: color ?? "#6366f1", emoji: emoji ?? "📁", type },
  });

  return NextResponse.json(category, { status: 201 });
}
