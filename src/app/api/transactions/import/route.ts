export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { parseCSV } from "@/lib/csv-parser";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const defaultCategoryId = formData.get("categoryId") as string | null;

  if (!file || !defaultCategoryId) {
    return NextResponse.json({ error: "Missing file or categoryId" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = parseCSV(text);

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid transactions found in CSV" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    parsed.map((tx) =>
      prisma.transaction.create({
        data: {
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          type: tx.type,
          categoryId: defaultCategoryId,
        },
      })
    )
  );

  return NextResponse.json({ imported: created.length });
}
