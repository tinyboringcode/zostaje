export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const logs = await prisma.notificationLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 20,
  });
  return NextResponse.json(logs);
}
