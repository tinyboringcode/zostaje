/**
 * PDF report generation for zostaje.
 *
 * Uses jspdf + jspdf-autotable for financial reports.
 * Dynamic import to avoid loading 300KB+ on every page.
 */

import type { StoredTx } from "./vault-queries";
import { formatCurrency, formatDate, toMonthKey, monthLabel } from "./formatters";

export type ReportPeriod = "day" | "week" | "month" | "quarter" | "year" | "custom";
export type ReportType = "summary" | "detailed" | "audit";

export interface ReportOptions {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  type: ReportType;
  companyName: string;
  nip: string;
  currency?: string;
}

interface JsPDFWithAutoTable {
  autoTable: (options: Record<string, unknown>) => void;
  lastAutoTable: { finalY: number };
  internal: { getNumberOfPages: () => number; pageSize: { getWidth: () => number; getHeight: () => number } };
  text: (text: string, x: number, y: number, options?: Record<string, unknown>) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFont: (fontName: string, fontStyle?: string) => void;
  addPage: () => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (width: number) => void;
  save: (filename: string) => void;
  output: (type: "blob") => Blob;
}

async function loadJsPDF(): Promise<{ default: new (options?: Record<string, unknown>) => JsPDFWithAutoTable }> {
  const [jspdf] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return jspdf as unknown as { default: new (options?: Record<string, unknown>) => JsPDFWithAutoTable };
}

function filterByDateRange(txs: StoredTx[], from: string, to: string): StoredTx[] {
  return txs.filter((t) => t.data.date >= from && t.data.date <= to);
}

function periodLabel(opts: ReportOptions): string {
  const labels: Record<ReportPeriod, string> = {
    day: "Raport dzienny",
    week: "Raport tygodniowy",
    month: "Raport miesieczny",
    quarter: "Raport kwartalny",
    year: "Raport roczny",
    custom: "Raport",
  };
  return labels[opts.period];
}

export async function generateReport(
  transactions: StoredTx[],
  options: ReportOptions,
): Promise<Blob> {
  const { default: jsPDF } = await loadJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const cur = options.currency || "PLN";
  const filtered = filterByDateRange(transactions, options.startDate, options.endDate);
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────────────────────

  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("zostaje.", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(periodLabel(options), 14, 28);
  doc.text(`${formatDate(options.startDate)} — ${formatDate(options.endDate)}`, 14, 33);

  if (options.companyName) {
    doc.text(options.companyName, pageWidth - 14, 20, { align: "right" });
  }
  if (options.nip) {
    doc.text(`NIP: ${options.nip}`, pageWidth - 14, 25, { align: "right" });
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, 38, pageWidth - 14, 38);

  // ── Summary ─────────────────────────────────────────────────────────

  const income = filtered.filter((t) => t.data.type === "przychod").reduce((s, t) => s + Math.abs(t.data.amount), 0);
  const expense = filtered.filter((t) => t.data.type === "wydatek").reduce((s, t) => s + Math.abs(t.data.amount), 0);
  const profit = income - expense;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Podsumowanie", 14, 46);

  doc.autoTable({
    startY: 50,
    head: [["", "Kwota"]],
    body: [
      ["Przychody", formatCurrency(income, cur)],
      ["Wydatki", formatCurrency(expense, cur)],
      ["Wynik", formatCurrency(profit, cur)],
      ["Liczba transakcji", String(filtered.length)],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [50, 50, 50] },
    headStyles: { fontStyle: "bold", textColor: [100, 100, 100], fontSize: 8 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  if (options.type === "summary") {
    // Monthly breakdown if year/quarter
    if (["year", "quarter", "custom"].includes(options.period) && filtered.length > 0) {
      const monthly = new Map<string, { income: number; expense: number }>();
      for (const tx of filtered) {
        const key = toMonthKey(tx.data.date);
        const prev = monthly.get(key) ?? { income: 0, expense: 0 };
        const amt = Math.abs(tx.data.amount);
        if (tx.data.type === "przychod") prev.income += amt;
        else prev.expense += amt;
        monthly.set(key, prev);
      }

      const rows = Array.from(monthly.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, v]) => [
          monthLabel(m),
          formatCurrency(v.income, cur),
          formatCurrency(v.expense, cur),
          formatCurrency(v.income - v.expense, cur),
        ]);

      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const y = doc.lastAutoTable.finalY + 10;
      doc.text("Zestawienie miesieczne", 14, y);

      doc.autoTable({
        startY: y + 4,
        head: [["Miesiac", "Przychody", "Wydatki", "Wynik"]],
        body: rows,
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
    }
  }

  // ── Detailed: full transaction table ────────────────────────────────

  if (options.type === "detailed") {
    const sorted = [...filtered].sort((a, b) => a.data.date.localeCompare(b.data.date));
    const rows = sorted.map((tx) => [
      formatDate(tx.data.date),
      tx.data.description.substring(0, 40),
      tx.data.category ?? "",
      tx.data.type === "przychod" ? "Przychod" : "Wydatek",
      formatCurrency(Math.abs(tx.data.amount), cur),
      tx.data.amount_net != null ? formatCurrency(tx.data.amount_net, cur) : "",
    ]);

    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Szczegoly transakcji", 14, y);

    doc.autoTable({
      startY: y + 4,
      head: [["Data", "Opis", "Kategoria", "Typ", "Kwota", "Netto"]],
      body: rows,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer on every page ────────────────────────────────────────────

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `Wygenerowano w zostaje. | ${new Date().toLocaleDateString("pl-PL")} | Strona ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
