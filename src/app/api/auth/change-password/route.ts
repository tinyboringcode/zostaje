export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, verifyPassword, hashPassword } from "@/server/auth";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Podaj aktualne i nowe hasło" }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "Nowe hasło musi mieć minimum 8 znaków" }, { status: 400 });
  }
  if (!verifyPassword(String(currentPassword), user.password)) {
    return NextResponse.json({ error: "Aktualne hasło jest nieprawidłowe" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(String(newPassword)) },
  });

  const response = NextResponse.json({ ok: true, reauth: true });
  response.cookies.delete("session");
  return response;
}
