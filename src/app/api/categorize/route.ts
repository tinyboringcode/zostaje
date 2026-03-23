import { NextRequest, NextResponse } from "next/server";
import { suggestCategory, learnFromTransaction } from "@/lib/categorizer";

export const dynamic = "force-dynamic";

// GET /api/categorize?q=...&type=EXPENSE
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "EXPENSE";

  if (q.length < 3) return NextResponse.json({ suggestion: null });

  const suggestion = await suggestCategory(q, type);
  return NextResponse.json({ suggestion });
}

// POST /api/categorize — learn from a confirmed transaction
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, categoryId, txType } = body;

  if (!description || !categoryId || !txType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await learnFromTransaction(description, categoryId, txType);
  return NextResponse.json({ ok: true });
}
