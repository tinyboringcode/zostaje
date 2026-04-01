export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { calcZusSocial, calcHealthInsurance, calcPitAdvance, type TaxForm, type ZusStage } from "@/lib/tax-calculator";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const now = new Date();

  let target = now;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    target = new Date(y, m - 1, 1);
  }

  const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
  const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
  const yearStart = new Date(target.getFullYear(), 0, 1);

  const [transactions, settings, contractors, budgets, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: yearStart, lte: monthEnd } },
      include: { category: { select: { mixedUsagePct: true, name: true, emoji: true, color: true } } },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.contractor.findMany({
      include: { invoices: { select: { amount: true, status: true, dueDate: true, issueDate: true } } },
    }),
    prisma.budget.findMany({ include: { category: true } }),
    prisma.category.findMany(),
  ]);

  // This month transactions
  const monthTx = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);
  const income = monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;

  // YTD for tax calculation
  const ytdRevenue = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const ytdCosts = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount * ((t.category.mixedUsagePct ?? 100) / 100), 0);

  const taxForm = (settings?.taxForm ?? "linear") as TaxForm;
  const zusStage = (settings?.zusStage ?? "full") as ZusStage;
  const monthsElapsed = target.getMonth() + 1;
  const monthlyIncome = Math.max(0, (ytdRevenue - ytdCosts) / Math.max(1, monthsElapsed));
  const monthlyRevenue = ytdRevenue / Math.max(1, monthsElapsed);
  const zusSocial = calcZusSocial(zusStage);
  const ytdZusSocial = zusSocial.total * monthsElapsed;
  const health = calcHealthInsurance(taxForm, monthlyIncome, monthlyRevenue);
  const ytdHealth = health * monthsElapsed;
  const healthDeduction = taxForm === "flat_rate" ? ytdHealth * 0.5 : taxForm === "linear" ? ytdHealth : 0;
  const pit = calcPitAdvance({
    taxForm,
    ryczaltRate: settings?.ryczaltRate ?? 12,
    cumulativeRevenue: ytdRevenue,
    cumulativeCosts: ytdCosts,
    cumulativePaidSocialZus: ytdZusSocial,
    cumulativePaidHealthDeduction: healthDeduction,
    cumulativePaidAdvances: 0,
  });
  const totalMonthlyBurden = Math.round(zusSocial.total + health + pit.advance);

  // Next ZUS date (always relative to real now, not target month)
  const zusDay = 20;
  const zusThisMonth = new Date(now.getFullYear(), now.getMonth(), zusDay);
  const zusDate = zusThisMonth > now ? zusThisMonth : new Date(now.getFullYear(), now.getMonth() + 1, zusDay);
  const daysToZus = Math.ceil((zusDate.getTime() - now.getTime()) / 86_400_000);

  // Invoices
  const allInvoices = contractors.flatMap((c) => c.invoices.map((i) => ({ ...i, contractorName: c.name })));
  const overdueCount = allInvoices.filter((i) => i.status === "overdue").length;
  const pendingCount = allInvoices.filter((i) => i.status === "pending" || i.status === "sent").length;
  const pendingAmount = allInvoices
    .filter((i) => i.status === "pending" || i.status === "sent")
    .reduce((s, i) => s + i.amount, 0);
  const overdueAmount = allInvoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);

  // Runway
  const last3MonthsExpense = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const avgMonthlyExpense = last3MonthsExpense > 0 ? last3MonthsExpense : expense;
  const cashBalance = ytdRevenue - ytdCosts;
  const runway = avgMonthlyExpense > 0 ? Math.round((cashBalance / avgMonthlyExpense) * 10) / 10 : null;

  // Top category this month
  const catSpend = new Map<string, { name: string; emoji: string; total: number }>();
  for (const t of monthTx.filter((t) => t.type === "EXPENSE")) {
    const key = t.categoryId;
    const prev = catSpend.get(key) ?? { name: t.category.name, emoji: t.category.emoji, total: 0 };
    catSpend.set(key, { ...prev, total: prev.total + t.amount });
  }
  const topCategory = Array.from(catSpend.values()).sort((a, b) => b.total - a.total)[0] ?? null;

  // Budget utilization
  const budgetStatus = budgets.map((b) => {
    const spent = monthTx
      .filter((t) => t.type === "EXPENSE" && t.categoryId === b.categoryId)
      .reduce((s, t) => s + t.amount, 0);
    const limit = b.limitAmount ?? 0;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return { name: b.category?.name ?? "?", emoji: b.category?.emoji ?? "", limit, spent, pct, over: pct > 100 };
  });

  // Cashflow last 6 months (mini sparkline data)
  const sparkData: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mIncome = transactions.filter((t) => t.type === "INCOME" && t.date >= mStart && t.date <= mEnd).reduce((s, t) => s + t.amount, 0);
    const mExpense = transactions.filter((t) => t.type === "EXPENSE" && t.date >= mStart && t.date <= mEnd).reduce((s, t) => s + t.amount, 0);
    const label = new Intl.DateTimeFormat("pl-PL", { month: "short" }).format(d);
    sparkData.push({ month: label, value: Math.round(mIncome - mExpense) });
  }

  // suppress unused variable warning
  void categories;

  // Real cash: profit minus tax burden minus unpaid obligations
  const netAfterTax = Math.round(profit - totalMonthlyBurden);

  return NextResponse.json({
    income: Math.round(income),
    expense: Math.round(expense),
    profit: Math.round(profit),
    netAfterTax,
    totalMonthlyBurden,
    overdueAmount: Math.round(overdueAmount),
    daysToZus,
    overdueCount,
    pendingCount,
    pendingAmount: Math.round(pendingAmount),
    runway,
    topCategory,
    budgetStatus,
    sparkData,
    taxForm,
    zusStage,
    transactionCount: monthTx.length,
  });
}
