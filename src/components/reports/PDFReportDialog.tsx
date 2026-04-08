"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, startOfYear } from "date-fns";
import { toast } from "sonner";
import { FileText, Download, X } from "lucide-react";
import { generateReport, downloadBlob, type ReportPeriod, type ReportType } from "@/lib/pdf-report";
import { useVaultAllTransactions } from "@/hooks/useVaultTransactions";

interface Props {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  nip?: string;
}

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "day", label: "Dzisiaj" },
  { value: "week", label: "Ten tydzien" },
  { value: "month", label: "Ten miesiac" },
  { value: "quarter", label: "Ten kwartal" },
  { value: "year", label: "Ten rok" },
  { value: "custom", label: "Wlasny zakres" },
];

const TYPE_OPTIONS: { value: ReportType; label: string; desc: string }[] = [
  { value: "summary", label: "Podsumowanie", desc: "Przychody, wydatki, wynik + zestawienie miesieczne" },
  { value: "detailed", label: "Szczegolowy", desc: "Pelna tabela transakcji z kwotami netto/brutto" },
  { value: "audit", label: "Audytowy", desc: "Pelny raport z dziennika zmian" },
];

function getDateRange(period: ReportPeriod): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (period) {
    case "day": return { from: fmt(now), to: fmt(now) };
    case "week": return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case "month": return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case "quarter": return { from: fmt(startOfQuarter(now)), to: fmt(now) };
    case "year": return { from: fmt(startOfYear(now)), to: fmt(now) };
    case "custom": return { from: fmt(startOfMonth(now)), to: fmt(now) };
  }
}

export function PDFReportDialog({ open, onClose, companyName = "", nip = "" }: Props) {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [type, setType] = useState<ReportType>("summary");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: allTxs } = useVaultAllTransactions();

  if (!open) return null;

  const handleGenerate = async () => {
    if (!allTxs) { toast.error("Brak danych"); return; }
    setGenerating(true);
    try {
      const range = period === "custom"
        ? { from: customFrom, to: customTo }
        : getDateRange(period);

      const blob = await generateReport(allTxs, {
        period,
        startDate: range.from,
        endDate: range.to,
        type,
        companyName,
        nip,
      });

      const filename = `zostaje-raport-${period}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      downloadBlob(blob, filename);
      toast.success("Raport PDF wygenerowany");
      onClose();
    } catch (e) {
      toast.error("Nie udalo sie wygenerowac raportu");
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }} onClick={onClose} />

      <div style={{ position: "relative", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, maxWidth: 480, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={16} style={{ color: "var(--text-2)" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--text-1)" }}>
              Generuj raport PDF
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-3)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Period */}
          <div>
            <label style={labelStyle}>Okres</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: "5px 12px", borderRadius: 4, border: "1px solid",
                    fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
                    background: period === p.value ? "var(--text-1)" : "transparent",
                    borderColor: period === p.value ? "var(--text-1)" : "var(--border)",
                    color: period === p.value ? "var(--bg)" : "var(--text-2)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={dateStyle} />
                <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={dateStyle} />
              </div>
            )}
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Typ raportu</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  style={{
                    padding: "10px 14px", borderRadius: 6, border: "1px solid",
                    borderColor: type === t.value ? "var(--text-1)" : "var(--border)",
                    background: type === t.value ? "var(--surface)" : "transparent",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{t.label}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-2)" }}>
            Anuluj
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 4, border: "1px solid var(--text-1)",
              background: "var(--text-1)", cursor: generating ? "wait" : "pointer",
              fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--bg)",
              opacity: generating ? 0.6 : 1,
            }}
          >
            <Download size={13} />
            {generating ? "Generuje..." : "Pobierz PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-sans)", fontSize: 11,
  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
  color: "var(--text-3)", marginBottom: 8,
};

const dateStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4,
  fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg)",
  color: "var(--text-1)", outline: "none",
};
