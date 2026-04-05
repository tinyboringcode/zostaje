export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

const MAX_BLOBS_PER_USER = 10;

/**
 * Simple bearer-token auth. For single-user JDG deployments the token
 * lives in the `SYNC_TOKEN` env variable and the user_id is a constant
 * "default". This avoids touching the existing auth-cookie flow.
 */
function authUserId(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  const expected = process.env.SYNC_TOKEN;
  if (!expected) return null;
  if (!token || token !== expected) return null;
  return "default";
}

export async function POST(req: NextRequest) {
  const userId = authUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { blob, device_id, timestamp } = body as {
    blob?: string;
    device_id?: string;
    timestamp?: string;
  };
  if (typeof blob !== "string" || !blob.length) {
    return NextResponse.json({ error: "missing blob" }, { status: 400 });
  }
  if (typeof device_id !== "string" || !device_id.length) {
    return NextResponse.json({ error: "missing device_id" }, { status: 400 });
  }

  // Next version = max(version) + 1.
  const last = await prisma.syncBlob.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;

  await prisma.syncBlob.create({
    data: {
      userId,
      deviceId: device_id,
      blob,
      version,
      ...(timestamp ? { createdAt: new Date(timestamp) } : {}),
    },
  });

  // Prune all but the newest MAX_BLOBS_PER_USER.
  const toKeep = await prisma.syncBlob.findMany({
    where: { userId },
    orderBy: { version: "desc" },
    take: MAX_BLOBS_PER_USER,
    select: { id: true },
  });
  const keepIds = new Set(toKeep.map((b) => b.id));
  await prisma.syncBlob.deleteMany({
    where: { userId, id: { notIn: Array.from(keepIds) } },
  });

  return NextResponse.json({ version });
}

export async function GET(req: NextRequest) {
  const userId = authUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const since = Number(req.nextUrl.searchParams.get("since") ?? 0);
  const latest = await prisma.syncBlob.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
  });
  if (!latest || latest.version <= since) {
    return NextResponse.json({ up_to_date: true });
  }
  return NextResponse.json({ blob: latest.blob, version: latest.version });
}
