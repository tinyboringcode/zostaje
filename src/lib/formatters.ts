import type { TransactionDraft, VatRate } from "./types";

export function formatCurrency(amount: number, currency = "PLN"): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function toMonthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return new Intl.DateTimeFormat("pl-PL", { month: "short", year: "numeric" }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
}

// ── Net / Gross / VAT helpers ────────────────────────────────────────────

export function vatRateLabel(rate: VatRate): string {
  if (rate === -1) return "ZW";
  return `${rate}%`;
}

export function computeGross(net: number, rate: VatRate): { gross: number; vat: number } {
  if (rate <= 0) return { gross: net, vat: 0 };
  const vat = Math.round(net * (rate / 100) * 100) / 100;
  return { gross: Math.round((net + vat) * 100) / 100, vat };
}

export function computeNet(gross: number, rate: VatRate): { net: number; vat: number } {
  if (rate <= 0) return { net: gross, vat: 0 };
  const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  return { net, vat: Math.round((gross - net) * 100) / 100 };
}

export function formatAmountFull(tx: TransactionDraft): string {
  const cur = tx.currency || "PLN";
  if (tx.amount_net != null && tx.amount_gross != null) {
    return `${formatCurrency(tx.amount_net, cur)} netto (${formatCurrency(tx.amount_gross, cur)} brutto)`;
  }
  return formatCurrency(tx.amount, cur);
}

export function formatAmountShort(amount: number, currency = "PLN"): string {
  return formatCurrency(amount, currency);
}
