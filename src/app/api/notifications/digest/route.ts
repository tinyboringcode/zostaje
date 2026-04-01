import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendMail, digestHtml } from "@/server/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true; // skip interval check when called manually

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings?.smtpEnabled) {
      return NextResponse.json({ error: "SMTP nie jest skonfigurowany" }, { status: 400 });
    }
    if (!settings.digestEnabled && !force) {
      return NextResponse.json({ skipped: true, reason: "Digest wyłączony" });
    }
    if (!settings.notificationEmail) {
      return NextResponse.json({ error: "Brak adresu e-mail odbiorcy" }, { status: 400 });
    }

    // Interval check (skip when force=true)
    if (!force && settings.lastDigestSentAt) {
      const now = new Date();
      const last = settings.lastDigestSentAt;
      const diffHours = (now.getTime() - last.getTime()) / 3_600_000;
      const minHours =
        settings.digestFrequency === "daily"
          ? 20
          : settings.digestFrequency === "weekly"
          ? 6 * 24
          : 27 * 24; // monthly

      if (diffHours < minHours) {
        return NextResponse.json({ skipped: true, reason: `Wysłano już ${Math.round(diffHours)}h temu` });
      }
    }

    // Calculate period
    const days = settings.digestDays ?? 7;
    const now = new Date();
    const from = new Date(now.getTime() - days * 86_400_000);
    from.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: from } },
      include: { category: true },
    });

    const income = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
    const profit = income - expense;

    // Aggregate by category (expenses only)
    const catMap = new Map<string, { name: string; emoji: string; total: number }>();
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      const key = t.categoryId;
      const existing = catMap.get(key);
      if (existing) {
        existing.total += t.amount;
      } else {
        catMap.set(key, {
          name: t.category.name,
          emoji: t.category.emoji,
          total: t.amount,
        });
      }
    }
    const topCategories = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

    const periodLabel =
      days <= 7
        ? `Ostatnie ${days} dni`
        : days <= 31
        ? `Ostatnie ${days} dni`
        : `Ostatnie ${Math.round(days / 30)} miesiące`;

    const subject = `📊 Raport finansowy — ${periodLabel} — ${settings.companyName}`;

    await sendMail({
      to: settings.notificationEmail,
      subject,
      html: digestHtml({
        companyName: settings.companyName,
        period: periodLabel,
        income,
        expense,
        profit,
        transactionCount: transactions.length,
        topCategories,
      }),
      type: "digest",
    });

    await prisma.settings.update({
      where: { id: 1 },
      data: { lastDigestSentAt: new Date() },
    });

    return NextResponse.json({ sent: true, transactions: transactions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
