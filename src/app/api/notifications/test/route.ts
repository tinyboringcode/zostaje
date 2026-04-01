export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendMail } from "@/server/mailer";

export async function POST() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings?.notificationEmail) {
    return NextResponse.json({ error: "Brak adresu e-mail powiadomień" }, { status: 400 });
  }

  try {
    await sendMail({
      to: settings.notificationEmail,
      subject: "✅ Test powiadomień — CashFlow JDG",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #22c55e;">✅ Powiadomienia działają!</h2>
          <p>To jest testowa wiadomość z <strong>${settings.companyName || "CashFlow JDG"}</strong>.</p>
          <p style="color: #6b7280; font-size: 13px;">Jeśli widzisz tę wiadomość, konfiguracja SMTP jest poprawna.</p>
        </div>
      `,
      type: "test",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd wysyłki";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
