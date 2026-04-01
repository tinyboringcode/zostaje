export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { simulateAllForms, type ZusStage } from "@/lib/tax-calculator";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const annualRevenue: number = body.annualRevenue ?? 0;
  const annualCosts: number = body.annualCosts ?? 0;
  const ryczaltRate: number = body.ryczaltRate ?? 12;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const zusStage = (settings?.zusStage ?? "full") as ZusStage;

  if (annualRevenue <= 0) {
    return NextResponse.json({ error: "annualRevenue must be > 0" }, { status: 400 });
  }

  const results = simulateAllForms({ annualRevenue, annualCosts, zusStage, ryczaltRate });
  return NextResponse.json({ results, zusStage });
}
