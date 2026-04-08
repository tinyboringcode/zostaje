export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("session");
  res.cookies.delete("auth-token");
  return res;
}
