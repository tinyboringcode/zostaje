export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendMail, budgetAlertHtml, overdueInvoiceHtml } from "@/server/mailer";

export async function POST() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings?.smtpEnabled || !settings.notificationEmail) {
    return NextResponse.json({ error: "Powiadomienia nie są skonfigurowane" }, { status: 400 });
  }

  // Interval check
  if (settings.notifyInterval !== "immediate" && settings.lastBudgetCheckAt) {
    const now = Date.now();
    const last = settings.lastBudgetCheckAt.getTime();
    const hoursSince = (now - last) / 1000 / 3600;
    if (settings.notifyInterval === "daily" && hoursSince < 24) {
      return NextResponse.json({ skipped: true, reason: "Za wcześnie (dzienny interwał)" });
    }
    if (settings.notifyInterval === "weekly" && hoursSince < 168) {
      return NextResponse.json({ skipped: true, reason: "Za wcześnie (tygodniowy interwał)" });
    }
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const alerts: string[] = [];

  // Budget alerts
  if (settings.budgetAlertEnabled) {
    const budgets = await prisma.budget.findMany({
      where: { month },
      include: { category: true },
    });

    for (const budget of budgets) {
      const agg = await prisma.transaction.aggregate({
        where: {
          categoryId: budget.categoryId,
          type: "EXPENSE",
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });
      const spent = agg._sum.amount ?? 0;
      const percent = (spent / budget.limitAmount) * 100;

      if (percent >= settings.budgetAlertThreshold) {
        await sendMail({
          to: settings.notificationEmail,
          subject: `${percent >= 100 ? "🔴 Przekroczono" : "⚠️ Zbliżasz się do"} budżetu: ${budget.category.emoji} ${budget.category.name}`,
          html: budgetAlertHtml({
            companyName: settings.companyName,
            category: `${budget.category.emoji} ${budget.category.name}`,
            spent,
            limit: budget.limitAmount,
            percent,
            month,
          }),
          type: "budget_alert",
        });
        alerts.push(`Budżet: ${budget.category.name} (${percent.toFixed(0)}%)`);
      }
    }
  }

  // Overdue invoices check
  const overdueInvoices = await prisma.contractorInvoice.findMany({
    where: { status: { in: ["pending", "overdue"] }, dueDate: { lt: now } },
    include: { contractor: true },
  });

  // Auto-mark as overdue
  if (overdueInvoices.length > 0) {
    await prisma.contractorInvoice.updateMany({
      where: { status: "pending", dueDate: { lt: now } },
      data: { status: "overdue" },
    });

    await sendMail({
      to: settings.notificationEmail,
      subject: `🔴 Przeterminowane faktury (${overdueInvoices.length})`,
      html: overdueInvoiceHtml({
        companyName: settings.companyName,
        invoices: overdueInvoices.map((inv) => ({
          contractor: inv.contractor.name,
          number: inv.number,
          amount: inv.amount,
          dueDate: inv.dueDate.toISOString().split("T")[0],
          daysOverdue: Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000),
        })),
      }),
      type: "overdue_invoice",
    });
    alerts.push(`Przeterminowane: ${overdueInvoices.length} faktur`);
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { lastBudgetCheckAt: now },
  });

  return NextResponse.json({ sent: alerts.length, alerts });
}
