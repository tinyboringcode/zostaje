import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./db";

const SECRET = process.env.NEXTAUTH_SECRET ?? "fallback-change-in-production";

if (process.env.NODE_ENV === "production" && SECRET === "fallback-change-in-production") {
  console.error("CRITICAL: NEXTAUTH_SECRET must be set in production!");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 310_000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = pbkdf2Sync(password, salt, 310_000, 64, "sha256").toString("hex");
  return timingSafeEqual(Buffer.from(verify, "hex"), Buffer.from(hash, "hex"));
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  const parsed = verifySessionToken(token);
  if (!parsed) return null;
  return prisma.user.findUnique({ where: { id: parsed.userId } });
}
