export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function linearRegression(y: number[]): { slope: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, r2: 0 };
  const x = y.map((_, i) => i);
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const meanY = sumY / n;
  const ssTot = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const pred = x.map((v) => meanY + slope * (v - (n - 1) / 2));
  const ssRes = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, r2 };
}

export async function GET() {
  const now = new Date();

  // Last 12 months of data
  const since = new Date(now);
  since.setMonth(since.getMonth() - 12);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: since } },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const contractors = await prisma.contractor.findMany({
    include: { invoices: true },
  });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  // --- Group by month ---
  const monthMap = new Map<string, { income: number; expense: number; count: number }>();
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const m = monthMap.get(key) ?? { income: 0, expense: 0, count: 0 };
    if (t.type === "INCOME") m.income += t.amount;
    else m.expense += t.amount;
    m.count++;
    monthMap.set(key, m);
  }

  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v, profit: v.income - v.expense }));

  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalExpense = months.reduce((s, m) => s + m.expense, 0);
  const avgMonthlyExpense = months.length > 0 ? totalExpense / months.length : 0;
  const avgMonthlyIncome = months.length > 0 ? totalIncome / months.length : 0;

  // --- Runway ---
  // Use last 3 months average expense for burn rate
  const last3 = months.slice(-3);
  const burnRate = last3.length > 0
    ? last3.reduce((s, m) => s + m.expense, 0) / last3.length
    : avgMonthlyExpense;

  // Current month balance: sum of all transactions (income - expense)
  const balance = transactions.reduce(
    (s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0
  );
  const runway = burnRate > 0 ? Math.max(0, balance / burnRate) : null;

  // --- Avg income per invoice ---
  const allPaidInvoices = contractors.flatMap((c) =>
    c.invoices.filter((i) => i.status === "paid")
  );
  const avgIncomePerInvoice =
    allPaidInvoices.length > 0
      ? allPaidInvoices.reduce((s, i) => s + i.amount, 0) / allPaidInvoices.length
      : null;

  // --- Most expensive month (seasonality) ---
  const mostExpensiveMonth = months.length > 0
    ? months.reduce((max, m) => (m.expense > max.expense ? m : max), months[0])
    : null;

  // --- Days to next ZUS payment ---
  // ZUS is due on the 15th (or 20th for small firms) of each month
  const zusDay = 20; // simplified: assume 20th for JDG ryczałt
  const thisMonth15 = new Date(now.getFullYear(), now.getMonth(), zusDay);
  const nextZus = thisMonth15 > now
    ? thisMonth15
    : new Date(now.getFullYear(), now.getMonth() + 1, zusDay);
  const daysToZus = Math.ceil((nextZus.getTime() - now.getTime()) / 86_400_000);

  // --- Revenue per client (contractor) ---
  const revenuePerClient = contractors
    .map((c) => ({
      id: c.id,
      name: c.name,
      companyType: c.companyType,
      revenue: c.invoices
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + i.amount, 0),
      totalInvoices: c.invoices.length,
    }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // --- Concentration risk ---
  const totalClientRevenue = revenuePerClient.reduce((s, c) => s + c.revenue, 0);
  const concentrationAlert =
    revenuePerClient.length > 0 && totalClientRevenue > 0
      ? revenuePerClient
          .filter((c) => c.revenue / totalClientRevenue >= 0.7)
          .map((c) => ({
            ...c,
            percent: Math.round((c.revenue / totalClientRevenue) * 100),
          }))
      : [];

  // --- Revenue trend (linear regression on monthly income) ---
  const incomeSeries = months.map((m) => m.income);
  const trend = linearRegression(incomeSeries);

  // --- Seasonality: detect low months ---
  const monthLabels = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
  const byCalMonth = Array.from({ length: 12 }, (_, i) => ({ label: monthLabels[i], income: 0, expense: 0, count: 0 }));
  for (const t of transactions) {
    const mi = t.date.getMonth();
    if (t.type === "INCOME") byCalMonth[mi].income += t.amount;
    else byCalMonth[mi].expense += t.amount;
    byCalMonth[mi].count++;
  }
  const avgIncome = byCalMonth.reduce((s, m) => s + m.income, 0) / 12;
  const lowMonths = byCalMonth
    .filter((m) => m.count > 0 && m.income < avgIncome * 0.7)
    .map((m) => m.label);

  // --- 3-month cashflow forecast ---
  const forecast = [1, 2, 3].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // Use last 3 same-calendar-month averages or overall average
    const calMonthIdx = d.getMonth();
    const historical = months.filter((m) => {
      const mi = new Date(m.month + "-01").getMonth();
      return mi === calMonthIdx;
    });
    const projIncome = historical.length > 0
      ? historical.reduce((s, m) => s + m.income, 0) / historical.length
      : avgMonthlyIncome;
    const projExpense = historical.length > 0
      ? historical.reduce((s, m) => s + m.expense, 0) / historical.length
      : avgMonthlyExpense;
    return {
      month: monthKey,
      projectedIncome: Math.round(projIncome),
      projectedExpense: Math.round(projExpense),
      projectedProfit: Math.round(projIncome - projExpense),
    };
  });

  // --- Break-even per month ---
  // Fixed costs = categories with consistent monthly spend
  const categoryExpense = new Map<string, { name: string; emoji: string; months: number; total: number }>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    const key = t.categoryId;
    const entry = categoryExpense.get(key) ?? { name: t.category.name, emoji: t.category.emoji, months: 0, total: 0 };
    entry.total += t.amount;
    categoryExpense.set(key, entry);
  }
  // Count months per category
  const catMonthCount = new Map<string, Set<string>>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    const key = t.date.getFullYear() + "-" + t.date.getMonth();
    const set = catMonthCount.get(t.categoryId) ?? new Set();
    set.add(key);
    catMonthCount.set(t.categoryId, set);
  }
  Array.from(categoryExpense.entries()).forEach(([id, entry]) => {
    entry.months = catMonthCount.get(id)?.size ?? 1;
  });
  const fixedCosts = Array.from(categoryExpense.values())
    .filter((c) => c.months >= Math.max(2, months.length * 0.5))
    .reduce((s, c) => s + c.total / c.months, 0);

  const breakEven = Math.round(fixedCosts + (avgMonthlyExpense - fixedCosts) * 0.3);

  // --- Company type stats ---
  const typeStats = contractors.reduce(
    (acc, c) => {
      acc[c.companyType] = (acc[c.companyType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    // Basic
    runway: runway !== null ? Math.round(runway * 10) / 10 : null,
    burnRate: Math.round(burnRate),
    balance: Math.round(balance),
    avgIncomePerInvoice: avgIncomePerInvoice !== null ? Math.round(avgIncomePerInvoice) : null,
    mostExpensiveMonth,
    daysToZus,
    nextZusDate: nextZus.toISOString().split("T")[0],
    // Intermediate
    revenuePerClient: revenuePerClient.slice(0, 10),
    totalClientRevenue: Math.round(totalClientRevenue),
    trend: { slope: Math.round(trend.slope), r2: Math.round(trend.r2 * 100) / 100 },
    avgMonthlyIncome: Math.round(avgMonthlyIncome),
    avgMonthlyExpense: Math.round(avgMonthlyExpense),
    // Advanced
    forecast,
    concentrationAlert,
    lowMonths,
    breakEven,
    seasonality: byCalMonth,
    // Meta
    months,
    typeStats,
    currency: settings?.currency ?? "PLN",
  });
}
