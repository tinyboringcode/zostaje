export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calcZusSocial, calcHealthInsurance, calcPitAdvance,
  getObligations, type TaxForm, type ZusStage,
} from "@/lib/tax-calculator";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ??
    (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) return NextResponse.json({ error: "No settings" }, { status: 400 });

  const taxForm = (settings.taxForm ?? "linear") as TaxForm;
  const zusStage = (settings.zusStage ?? "full") as ZusStage;
  const ryczaltRate = settings.ryczaltRate ?? 12;

  // Get YTD transactions for current year
  const [y] = month.split("-").map(Number);
  const yearStart = new Date(y, 0, 1);
  const monthEnd = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: yearStart, lte: monthEnd } },
    include: { category: { select: { mixedUsagePct: true } } },
  });

  // Apply mixed usage percentage to expenses
  const ytdRevenue = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);

  const ytdCosts = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount * ((t.category.mixedUsagePct ?? 100) / 100), 0);

  // Months so far in year
  const monthsElapsed = Number(month.split("-")[1]);
  const monthlyRevenue = ytdRevenue / Math.max(1, monthsElapsed);
  const monthlyIncome = Math.max(0, (ytdRevenue - ytdCosts) / Math.max(1, monthsElapsed));

  // ZUS social
  const zusSocial = calcZusSocial(zusStage);
  const ytdZusSocial = zusSocial.total * monthsElapsed;

  // Health insurance
  const health = calcHealthInsurance(taxForm, monthlyIncome, monthlyRevenue);
  const ytdHealth = health * monthsElapsed;

  // Health deduction YTD
  const healthDeduction = taxForm === "flat_rate"
    ? ytdHealth * 0.5
    : taxForm === "linear"
    ? ytdHealth
    : 0;

  // PIT advance (cumulative YTD)
  const pit = calcPitAdvance({
    taxForm,
    ryczaltRate,
    cumulativeRevenue: ytdRevenue,
    cumulativeCosts: ytdCosts,
    cumulativePaidSocialZus: ytdZusSocial,
    cumulativePaidHealthDeduction: healthDeduction,
    cumulativePaidAdvances: 0, // user hasn't tracked payments yet
  });

  // Obligations calendar
  const obligations = getObligations(new Date(), {
    zusStage,
    taxForm,
    isVatPayer: settings.isVatPayer,
    vatPeriod: settings.vatPeriod ?? "monthly",
    nip: settings.nip,
    monthlyIncome,
    monthlyRevenue,
    ryczaltRate,
  });

  // ZUS stage progress (if applicable)
  let zusProgress: {
    stage: ZusStage; monthsIn: number; monthsRemaining: number; nextStage: string;
  } | null = null;

  if (settings.companyStartDate && zusStage !== "full") {
    const start = new Date(settings.companyStartDate);
    const monthsIn = Math.floor((new Date().getTime() - start.getTime()) / (30.44 * 86_400_000));
    const stageInfo = {
      ulga_na_start:  { total: 6,  next: "Mały ZUS" },
      maly_zus:       { total: 24, next: "Mały ZUS Plus" },
      maly_zus_plus:  { total: 36, next: "Pełny ZUS" },
      full:           { total: 999, next: "—" },
    } as const;
    const info = stageInfo[zusStage];
    zusProgress = {
      stage: zusStage,
      monthsIn: Math.min(monthsIn, info.total),
      monthsRemaining: Math.max(0, info.total - monthsIn),
      nextStage: info.next,
    };
  }

  return NextResponse.json({
    month,
    taxForm,
    zusStage,
    ryczaltRate,
    ytdRevenue: Math.round(ytdRevenue),
    ytdCosts: Math.round(ytdCosts),
    ytdProfit: Math.round(ytdRevenue - ytdCosts),
    monthlyRevenue: Math.round(monthlyRevenue),
    monthlyIncome: Math.round(monthlyIncome),
    zusSocial: { ...zusSocial, monthly: zusSocial.total, ytd: Math.round(ytdZusSocial) },
    health: { monthly: Math.round(health), ytd: Math.round(ytdHealth) },
    pit: {
      advance: Math.round(pit.advance),
      ytdTax: Math.round(pit.tax),
      taxBase: Math.round(pit.taxBase),
      effectiveRate: pit.effectiveRate,
    },
    totalMonthlyBurden: Math.round(zusSocial.total + health + pit.advance),
    obligations,
    zusProgress,
    isVatPayer: settings.isVatPayer,
    vatPeriod: settings.vatPeriod ?? "monthly",
    nip: settings.nip,
    currency: settings.currency ?? "PLN",
  });
}
