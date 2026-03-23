import { NextResponse } from "next/server";
import { detectAnomalies } from "@/lib/fingerprint";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Need at least 60 transactions to run fingerprint
  const count = await prisma.transaction.count();
  if (count < 60) {
    return NextResponse.json({ anomalies: [], insufficient: true, txCount: count });
  }

  const anomalies = await detectAnomalies();
  return NextResponse.json({ anomalies, insufficient: false, txCount: count });
}
