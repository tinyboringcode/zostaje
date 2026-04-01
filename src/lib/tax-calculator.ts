/**
 * Polish tax calculator for JDG (sole proprietorship)
 * Covers: tax scale (skala), linear (liniowy), flat rate (ryczałt)
 * ZUS stages: ulga_na_start, maly_zus, maly_zus_plus, full
 * Health insurance: varies by tax form
 *
 * ZUS rates: see src/lib/zus-2026.ts (single source of truth)
 */

import { ZUS_BASE_2026, ZUS_PREFERENCYJNY } from "@/lib/zus-2026";

export type TaxForm = "tax_scale" | "linear" | "flat_rate";
export type ZusStage = "ulga_na_start" | "maly_zus" | "maly_zus_plus" | "full";

// ── 2026 ZUS bases & rates ────────────────────────────────────────────────────
const ZUS_2026 = {
  fullBase: ZUS_BASE_2026,  // from zus-2026.ts — single source of truth
  smallBase: ZUS_PREFERENCYJNY.emerytalna.amount / ZUS_PREFERENCYJNY.emerytalna.rate, // ~1025.77
  minSalary: 4300.27,       // minimalne wynagrodzenie 2026
  rates: {
    emerytalne:  0.1952,
    rentowe:     0.0800,
    chorobowe:   0.0245,
    wypadkowe:   0.0167,
    fp:          0.0245,    // Fundusz Pracy
    fgssp:       0.0010,    // FGŚP
  },
} as const;

// ── ZUS social contributions ──────────────────────────────────────────────────
export function calcZusSocial(stage: ZusStage, base?: number): {
  emerytalne: number; rentowe: number; chorobowe: number; wypadkowe: number;
  fp: number; total: number; base: number;
} {
  if (stage === "ulga_na_start") {
    // Pierwsze 6 miesięcy: ZERO składek społecznych (tylko zdrowotna)
    return { emerytalne: 0, rentowe: 0, chorobowe: 0, wypadkowe: 0, fp: 0, total: 0, base: 0 };
  }

  const b = base ?? (
    stage === "maly_zus" || stage === "maly_zus_plus"
      ? ZUS_2026.smallBase
      : ZUS_2026.fullBase
  );

  const r = ZUS_2026.rates;
  const emerytalne  = round2(b * r.emerytalne);
  const rentowe     = round2(b * r.rentowe);
  const chorobowe   = round2(b * r.chorobowe);
  const wypadkowe   = round2(b * r.wypadkowe);
  const fp          = stage === "full" ? round2(b * r.fp) : 0; // FP tylko przy pełnym
  const total       = emerytalne + rentowe + chorobowe + wypadkowe + fp;
  return { emerytalne, rentowe, chorobowe, wypadkowe, fp, total, base: b };
}

// ── Health insurance (składka zdrowotna) ──────────────────────────────────────
export function calcHealthInsurance(
  taxForm: TaxForm,
  monthlyIncome: number,    // for tax_scale/linear: dochód (przychód - koszty)
  monthlyRevenue: number,   // for flat_rate: przychód
): number {
  if (taxForm === "flat_rate") {
    // Ryczałt 2025: składka zdrowotna zryczałtowana wg progu przychodu
    // Podstawy: 60% / 100% / 180% przeciętnego miesięcznego wynagrodzenia (8673 PLN)
    const annualRev = monthlyRevenue * 12;
    if (annualRev <= 60_000)  return round2(8673 * 0.60 * 0.09);  // 468.34 zł
    if (annualRev <= 300_000) return round2(8673 * 1.00 * 0.09);  // 780.57 zł
    return round2(8673 * 1.80 * 0.09);                              // 1405.03 zł
  }

  if (taxForm === "linear") {
    // 4.9% dochodu, minimum 314.96 PLN
    const raw = monthlyIncome * 0.049;
    return Math.max(314.96, round2(raw));
  }

  // Skala: 9% dochodu, minimum 314.96 PLN
  const raw = monthlyIncome * 0.09;
  return Math.max(314.96, round2(raw));
}

// ── Income tax (zaliczka PIT) ─────────────────────────────────────────────────
export interface PitCalcInput {
  taxForm: TaxForm;
  ryczaltRate: number;       // % for flat_rate (e.g. 12)
  cumulativeRevenue: number; // YTD
  cumulativeCosts: number;   // YTD (0 for flat_rate)
  cumulativePaidSocialZus: number; // YTD paid social contributions (deductible)
  cumulativePaidHealthDeduction: number; // YTD deductible part of health
  cumulativePaidAdvances: number; // YTD already paid PIT advances
}

export function calcPitAdvance(input: PitCalcInput): {
  taxBase: number;
  tax: number;
  advance: number; // to pay this month
  effectiveRate: number;
} {
  const {
    taxForm, ryczaltRate, cumulativeRevenue, cumulativeCosts,
    cumulativePaidSocialZus, cumulativePaidHealthDeduction,
    cumulativePaidAdvances,
  } = input;

  if (taxForm === "flat_rate") {
    // Ryczałt — brak odliczenia kosztów, ale odliczamy 50% składki zdrowotnej
    const taxBase = Math.max(0, cumulativeRevenue - cumulativePaidSocialZus - cumulativePaidHealthDeduction);
    const tax = round2(taxBase * (ryczaltRate / 100));
    const advance = Math.max(0, round2(tax - cumulativePaidAdvances));
    return { taxBase, tax, advance, effectiveRate: cumulativeRevenue > 0 ? (tax / cumulativeRevenue) * 100 : 0 };
  }

  if (taxForm === "linear") {
    const income = cumulativeRevenue - cumulativeCosts - cumulativePaidSocialZus;
    const taxBase = Math.max(0, income);
    const tax = round2(taxBase * 0.19);
    const deductedHealth = Math.min(cumulativePaidHealthDeduction, tax);
    const taxAfterHealth = Math.max(0, tax - deductedHealth);
    const advance = Math.max(0, round2(taxAfterHealth - cumulativePaidAdvances));
    return {
      taxBase,
      tax: taxAfterHealth,
      advance,
      effectiveRate: cumulativeRevenue > 0 ? (taxAfterHealth / cumulativeRevenue) * 100 : 0,
    };
  }

  // Skala podatkowa
  const FREE_AMOUNT = 30_000;
  const THRESHOLD = 120_000;
  const income = cumulativeRevenue - cumulativeCosts - cumulativePaidSocialZus;
  const taxBase = Math.max(0, income);

  let tax = 0;
  if (taxBase > THRESHOLD) {
    tax = round2((THRESHOLD - FREE_AMOUNT) * 0.12 + (taxBase - THRESHOLD) * 0.32);
  } else {
    tax = round2(Math.max(0, taxBase - FREE_AMOUNT) * 0.12);
  }
  const advance = Math.max(0, round2(tax - cumulativePaidAdvances));
  return {
    taxBase,
    tax,
    advance,
    effectiveRate: cumulativeRevenue > 0 ? (tax / cumulativeRevenue) * 100 : 0,
  };
}

// ── Annual tax comparison simulator ──────────────────────────────────────────
export interface AnnualSimInput {
  annualRevenue: number;
  annualCosts: number;        // 0 for flat_rate comparison
  zusStage: ZusStage;
  ryczaltRate: number;
}

export interface AnnualSimResult {
  taxForm: TaxForm;
  label: string;
  annualTax: number;
  annualZusSocial: number;
  annualHealth: number;
  totalBurden: number;        // tax + health (ZUS social same across forms)
  netIncome: number;
  effectiveTaxRate: number;   // % of revenue
}

export function simulateAllForms(input: AnnualSimInput): AnnualSimResult[] {
  const { annualRevenue, annualCosts, zusStage, ryczaltRate } = input;
  const zus = calcZusSocial(zusStage);
  const annualZusSocial = zus.total * 12;

  const results: AnnualSimResult[] = [];

  for (const form of ["tax_scale", "linear", "flat_rate"] as TaxForm[]) {
    const monthlyIncome = (annualRevenue - annualCosts - annualZusSocial) / 12;
    const monthlyRevenue = annualRevenue / 12;

    const monthlyHealth = calcHealthInsurance(
      form,
      Math.max(0, monthlyIncome),
      monthlyRevenue,
    );
    const annualHealth = round2(monthlyHealth * 12);

    const pitInput: PitCalcInput = {
      taxForm: form,
      ryczaltRate,
      cumulativeRevenue: annualRevenue,
      cumulativeCosts: form === "flat_rate" ? 0 : annualCosts,
      cumulativePaidSocialZus: annualZusSocial,
      cumulativePaidHealthDeduction: form === "flat_rate"
        ? round2(annualHealth * 0.5)
        : form === "linear"
        ? annualHealth  // 100% deductible for liniowy
        : 0,            // skala: not deductible from base
      cumulativePaidAdvances: 0,
    };
    const pit = calcPitAdvance(pitInput);
    const annualTax = round2(pit.tax);
    const totalBurden = annualTax + annualHealth + annualZusSocial;
    const netIncome = annualRevenue - annualCosts - totalBurden;

    results.push({
      taxForm: form,
      label: form === "tax_scale" ? "Skala (12%/32%)" : form === "linear" ? "Liniowy 19%" : `Ryczałt ${ryczaltRate}%`,
      annualTax,
      annualZusSocial,
      annualHealth,
      totalBurden,
      netIncome: round2(netIncome),
      effectiveTaxRate: round2((totalBurden / annualRevenue) * 100),
    });
  }

  return results;
}

// ── ZUS obligations calendar ──────────────────────────────────────────────────
export interface Obligation {
  title: string;
  dueDay: number;         // day of month
  dueDate: Date;
  daysUntil: number;
  amount?: number;
  transferTitle?: string;
  urgent: boolean;        // <= 5 days
  description: string;
}

export function getObligations(
  now: Date,
  settings: {
    zusStage: ZusStage;
    taxForm: TaxForm;
    isVatPayer: boolean;
    vatPeriod: string;
    nip: string;
    monthlyIncome?: number;
    monthlyRevenue?: number;
    ryczaltRate?: number;
  }
): Obligation[] {
  const { zusStage, taxForm, isVatPayer, vatPeriod, nip, ryczaltRate = 12 } = settings;

  const obligations: Obligation[] = [];

  // Determine "current" month period
  const y = now.getFullYear();
  const m = now.getMonth();

  function nextDueDate(day: number): Date {
    const thisMonth = new Date(y, m, day);
    if (thisMonth > now) return thisMonth;
    return new Date(y, m + 1, day);
  }

  function daysUntil(d: Date): number {
    return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  }

  // ZUS social (20th) — not for ulga_na_start
  if (zusStage !== "ulga_na_start") {
    const zus = calcZusSocial(zusStage);
    const dueDate = nextDueDate(20);
    const health = calcHealthInsurance(
      taxForm,
      settings.monthlyIncome ?? 0,
      settings.monthlyRevenue ?? 0,
    );
    const total = round2(zus.total + health);
    obligations.push({
      title: "ZUS społeczny + zdrowotna",
      dueDay: 20,
      dueDate,
      daysUntil: daysUntil(dueDate),
      amount: total,
      transferTitle: `Składki ZUS ${nip || "NIP"} ${getMonthString(dueDate)}`,
      urgent: daysUntil(dueDate) <= 5,
      description: `Społeczne: ${fmt(zus.total)} · Zdrowotna: ${fmt(health)}`,
    });
  }

  // PIT advance (20th of following month) — not for flat_rate quarterly
  const pitDue = nextDueDate(20);
  obligations.push({
    title: taxForm === "flat_rate" ? "Ryczałt — zaliczka" : "Zaliczka PIT",
    dueDay: 20,
    dueDate: pitDue,
    daysUntil: daysUntil(pitDue),
    transferTitle: `Zaliczka ${taxForm === "linear" ? "PIT-36L" : "PIT-36"} ${nip || "NIP"} ${getMonthString(pitDue)}`,
    urgent: daysUntil(pitDue) <= 5,
    description: taxForm === "flat_rate"
      ? `Ryczałt ${ryczaltRate}% od przychodu`
      : taxForm === "linear"
      ? "19% od dochodu (przychód − koszty − ZUS)"
      : "12%/32% od dochodu z kwotą wolną 30 000 PLN",
  });

  // VAT (25th) — only for VAT payers
  if (isVatPayer) {
    const isQuarterly = vatPeriod === "quarterly";
    const vatMonth = now.getMonth();
    const isQuarterEnd = [2, 5, 8, 11].includes(vatMonth); // Mar, Jun, Sep, Dec
    if (!isQuarterly || isQuarterEnd) {
      const vatDue = nextDueDate(25);
      obligations.push({
        title: isQuarterly ? "VAT-7K (kwartalnie)" : "VAT-7 (miesięcznie)",
        dueDay: 25,
        dueDate: vatDue,
        daysUntil: daysUntil(vatDue),
        transferTitle: `VAT-7${isQuarterly ? "K" : ""} ${nip || "NIP"} ${getMonthString(vatDue)}`,
        urgent: daysUntil(vatDue) <= 5,
        description: `Deklaracja VAT i wpłata nadwyżki do urzędu skarbowego`,
      });
    }
  }

  return obligations.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ── Spending behavior / cycle detection ──────────────────────────────────────
export interface SpendingPattern {
  categoryId: string;
  categoryName: string;
  emoji: string;
  avgMonthly: number;
  trend: "rising" | "falling" | "stable";
  slopePercent: number;        // % change per month
  isRecurring: boolean;        // appears >80% of months
  peakMonth: string;           // "Lip"
  monthsPresent: number;
  totalSpent: number;
  lastMonthAmount: number;
}

export interface CycleAnalysis {
  patterns: SpendingPattern[];
  topGrowingCosts: SpendingPattern[];
  recurringFixed: SpendingPattern[];
  incomeConcentration: number;  // % from top client
  cashflowVolatility: number;   // stddev / mean of monthly profits
  avgPaymentDelay: number;      // days (from invoices)
  recommendation: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function round2(n: number) { return Math.round(n * 100) / 100; }
function fmt(n: number) { return n.toFixed(2) + " zł"; }
function getMonthString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── ZUS account number (personal, NIP-based) ─────────────────────────────────
export function getZusAccountNumber(nip: string): string {
  if (!nip || nip.length !== 10) return "Uzupełnij NIP w Ustawieniach, aby zobaczyć numer konta";
  // ZUS account: check-digits + bank code + NIP padded to 10 chars + "0000000000"
  // Real calculation would need NRC verification — showing formula note instead
  return `NIP ${nip} → konto do ZUS sprawdź na: zus.pl/firmy/przedsiebiorcy/skladki/wplata-skladek`;
}

export function getUrzadSkarbowy(nip: string): string {
  if (!nip || nip.length !== 10) return "Uzupełnij NIP w Ustawieniach";
  return `Mikrorachunek podatkowy: sprawdź na esekacja.mf.gov.pl/nip/${nip}`;
}
