export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

const MONTHS_PL = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];

function linearSlope(y: number[]): number {
  const n = y.length;
  if (n < 2) return 0;
  const x = y.map((_, i) => i);
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

export async function GET() {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  since.setDate(1);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: since } },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const contractors = await prisma.contractor.findMany({
    include: { invoices: { select: { amount: true, issueDate: true, paidAt: true, status: true } } },
  });

  // ── Per-category monthly breakdown ───────────────────────────────────────
  type CatData = {
    name: string; emoji: string; color: string;
    byMonth: Map<string, number>; total: number;
  };
  const catMap = new Map<string, CatData>();

  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    const key = t.categoryId;
    if (!catMap.has(key)) {
      catMap.set(key, { name: t.category.name, emoji: t.category.emoji, color: t.category.color, byMonth: new Map(), total: 0 });
    }
    const cat = catMap.get(key)!;
    const mKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    cat.byMonth.set(mKey, (cat.byMonth.get(mKey) ?? 0) + t.amount);
    cat.total += t.amount;
  }

  // Build month list (last 12)
  const allMonths: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    allMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const patterns = Array.from(catMap.entries()).map(([id, cat]) => {
    const series = allMonths.map((m) => cat.byMonth.get(m) ?? 0);
    const nonZero = series.filter((v) => v > 0).length;
    const slope = linearSlope(series);
    const avg = cat.total / Math.max(1, nonZero);
    const lastMonth = series[series.length - 1];
    const peakIdx = series.indexOf(Math.max(...series));

    return {
      categoryId: id,
      categoryName: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      avgMonthly: Math.round(avg),
      trend: slope > avg * 0.05 ? "rising" : slope < -avg * 0.05 ? "falling" : "stable",
      slopePercent: avg > 0 ? Math.round((slope / avg) * 100) : 0,
      isRecurring: nonZero >= Math.round(allMonths.length * 0.8),
      peakMonth: MONTHS_PL[new Date(allMonths[peakIdx] + "-01").getMonth()],
      monthsPresent: nonZero,
      totalSpent: Math.round(cat.total),
      lastMonthAmount: Math.round(lastMonth),
      series,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  // ── Income by month ───────────────────────────────────────────────────────
  const incomeByMonth = new Map<string, number>();
  const profitByMonth = new Map<string, number>();
  for (const t of transactions) {
    const m = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const prev = incomeByMonth.get(m) ?? 0;
    if (t.type === "INCOME") incomeByMonth.set(m, prev + t.amount);
    else profitByMonth.set(m, (profitByMonth.get(m) ?? 0) - t.amount);
  }
  // Add income to profit map
  Array.from(incomeByMonth.entries()).forEach(([m, inc]) => {
    profitByMonth.set(m, (profitByMonth.get(m) ?? 0) + inc);
  });

  // ── Cashflow volatility ───────────────────────────────────────────────────
  const profits = allMonths.map((m) => profitByMonth.get(m) ?? 0);
  const meanProfit = profits.reduce((s, v) => s + v, 0) / profits.length;
  const cashflowVolatility = meanProfit !== 0 ? Math.round((stddev(profits) / Math.abs(meanProfit)) * 100) : 0;

  // ── Average payment delay ─────────────────────────────────────────────────
  const paidInvoices = contractors.flatMap((c) =>
    c.invoices.filter((i) => i.status === "paid" && i.paidAt),
  );
  const avgPaymentDelay = paidInvoices.length > 0
    ? Math.round(
        paidInvoices.reduce((s, i) => {
          const delay = (i.paidAt!.getTime() - i.issueDate.getTime()) / 86_400_000;
          return s + delay;
        }, 0) / paidInvoices.length
      )
    : null;

  // ── Income concentration ──────────────────────────────────────────────────
  const clientRevenue = contractors.map((c) => ({
    name: c.name,
    revenue: c.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0),
  })).filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const totalRev = clientRevenue.reduce((s, c) => s + c.revenue, 0);
  const topClientPct = totalRev > 0 && clientRevenue.length > 0
    ? Math.round((clientRevenue[0].revenue / totalRev) * 100)
    : 0;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations: string[] = [];

  const risingCosts = patterns.filter((p) => p.trend === "rising" && p.avgMonthly > 200);
  if (risingCosts.length > 0) {
    recommendations.push(`Rosnące koszty: ${risingCosts.slice(0, 2).map((p) => p.categoryName).join(", ")} — wzrost ${risingCosts[0].slopePercent}%/mies.`);
  }

  if (cashflowVolatility > 60) {
    recommendations.push(`Wysoka zmienność cashflow (${cashflowVolatility}%) — rozważ budowanie funduszu awaryjnego na poziomie 3 miesięcy kosztów.`);
  }

  if (topClientPct >= 70) {
    recommendations.push(`Koncentracja przychodów: ${clientRevenue[0]?.name} to ${topClientPct}% dochodów. Dywersyfikuj bazę klientów.`);
  }

  if (avgPaymentDelay !== null && avgPaymentDelay > 30) {
    recommendations.push(`Średni czas płatności faktur: ${avgPaymentDelay} dni. Rozważ krótsze terminy lub przedpłaty.`);
  }

  const recurringCosts = patterns.filter((p) => p.isRecurring);
  const fixedTotal = recurringCosts.reduce((s, p) => s + p.avgMonthly, 0);
  if (fixedTotal > 0) {
    recommendations.push(`Stałe miesięczne koszty: ~${Math.round(fixedTotal).toLocaleString("pl-PL")} zł (${recurringCosts.length} kategorii). To Twój break-even.`);
  }

  // Monthly income series for income volatility
  const incomeMonths = allMonths.map((m) => incomeByMonth.get(m) ?? 0).filter((v) => v > 0);
  if (incomeMonths.length >= 3) {
    const incMean = incomeMonths.reduce((s, v) => s + v, 0) / incomeMonths.length;
    const incVol = Math.round((stddev(incomeMonths) / incMean) * 100);
    if (incVol > 40) {
      recommendations.push(`Nieregularne przychody (zmienność ${incVol}%) — pilnuj płynności w słabszych miesiącach.`);
    }
  }

  return NextResponse.json({
    patterns,
    topGrowingCosts: patterns.filter((p) => p.trend === "rising").slice(0, 5),
    recurringFixed: patterns.filter((p) => p.isRecurring).slice(0, 8),
    cashflowVolatility,
    avgPaymentDelay,
    incomeConcentration: topClientPct,
    topClient: clientRevenue[0] ?? null,
    monthLabels: allMonths.map((m) => MONTHS_PL[new Date(m + "-01").getMonth()]),
    recommendations,
  });
}
